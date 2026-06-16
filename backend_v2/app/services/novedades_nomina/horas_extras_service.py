"""
Service layer principal del módulo de Horas Extras y Pre-liquidación.

Responsabilidad: orquestación con DB (cargar catálogo, factor, ejecutar cálculo)
y CRUD administrativo (catálogo, horario, override, bolsa).

El cálculo puro vive en `horas_extras_calculo.py` y la confirmación/lectura
vive en `horas_extras_confirmacion.py` para mantener cada archivo <500 líneas.
"""
import logging
from datetime import date, datetime
from typing import List, Optional, Tuple
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

from ...models.novedades_nomina.horas_extras import (
    NominaCatalogoNovedad,
    NominaFactorPrestacionalRiesgo,
    NominaHorarioPactado,
    NominaOverrideAutorizaHE,
    NominaBolsaHoras,
)
from ...models.novedades_nomina.schemas_horas_extras import (
    PreLiquidacionInput,
    NovedadCatalogoCreate,
    OverrideAutorizaHECreate,
)
from .horas_extras_calculo import calcular_pre_liquidacion

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Catálogo de novedades y factores ARL
# ---------------------------------------------------------------------------

async def listar_catalogo_vigente(
    session: AsyncSession,
    categoria: Optional[str] = None,
    solo_acreditan_bolsa: bool = False,
    fecha_referencia: Optional[date] = None,
) -> List[NominaCatalogoNovedad]:
    """Lista las novedades activas y vigentes a la fecha de referencia."""
    fecha = fecha_referencia or date.today()
    stmt = select(NominaCatalogoNovedad).where(
        NominaCatalogoNovedad.estado == "ACTIVO",
        NominaCatalogoNovedad.vigente_desde <= fecha,
    )
    if categoria:
        stmt = stmt.where(NominaCatalogoNovedad.categoria == categoria)
    if solo_acreditan_bolsa:
        stmt = stmt.where(NominaCatalogoNovedad.acredita_bolsa == True)  # noqa: E712
    result = await session.execute(stmt.order_by(NominaCatalogoNovedad.codigo))
    return result.scalars().all()


async def obtener_factor_por_nivel(
    session: AsyncSession,
    nivel_riesgo: str,
    fecha_referencia: Optional[date] = None,
) -> Optional[NominaFactorPrestacionalRiesgo]:
    """Devuelve el factor prestacional vigente para un nivel ARL."""
    fecha = fecha_referencia or date.today()
    stmt = select(NominaFactorPrestacionalRiesgo).where(
        NominaFactorPrestacionalRiesgo.nivel_riesgo == nivel_riesgo,
        NominaFactorPrestacionalRiesgo.vigente_desde <= fecha,
    )
    result = await session.execute(stmt)
    return result.scalars().first()


# ---------------------------------------------------------------------------
# Resolución efectiva de autorización HE
# ---------------------------------------------------------------------------

async def resolver_autorizacion_he(
    session: AsyncSession,
    cedula: str,
) -> Tuple[bool, str]:
    """
    Devuelve (autoriza_he, fuente) donde fuente ∈ {'OVERRIDE', 'ERP', 'SIN_DATOS'}.
    Prioridad: override vigente > default del ERP > denegado.
    """
    ahora = datetime.now()
    stmt_override = select(NominaOverrideAutorizaHE).where(
        NominaOverrideAutorizaHE.cedula == cedula,
        NominaOverrideAutorizaHE.estado == "ACTIVO",
        NominaOverrideAutorizaHE.vigente_desde <= ahora,
    )
    result_o = await session.execute(stmt_override)
    overrides = result_o.scalars().all()
    vigente = next(
        (o for o in overrides if o.vigente_hasta is None or o.vigente_hasta > ahora),
        None,
    )
    if vigente is not None:
        return vigente.autoriza_he_override, "OVERRIDE"

    stmt_h = select(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    horario = (await session.execute(stmt_h)).scalar_one_or_none()
    if horario is None:
        return False, "SIN_DATOS"
    return horario.autoriza_he_default, "ERP"


# ---------------------------------------------------------------------------
# Orquestador con DB
# ---------------------------------------------------------------------------

async def ejecutar_pre_liquidacion(
    session: AsyncSession,
    input_data: PreLiquidacionInput,
):
    """
    Versión con DB: carga catálogo y factor prestacional, luego delega
    a la función pura `calcular_pre_liquidacion`.

    Si `input_data.registro_diario` viene con 7 entradas, sobreescribe
    `horas_por_dia` derivándolo de las horas reales (entrada/salida/almuerzo).
    """
    # Si el cliente mandó el registro reloj (entrada/salida/almuerzo), derivamos
    # las horas trabajadas por día. Esto refleja la UX natural: el usuario teclea
    # las horas del reloj y el sistema calcula, en lugar de forzar aritmética mental.
    if input_data.registro_diario is not None:
        input_data = _aplicar_registro_diario(input_data)

    novedades_db = await listar_catalogo_vigente(session)
    catalogo = [
        {
            "codigo": n.codigo,
            "factor_hora_ordinaria": n.factor_hora_ordinaria,
            "acredita_bolsa": n.acredita_bolsa,
            "descuenta_bolsa": n.descuenta_bolsa,
            "unidad": n.unidad,
        }
        for n in novedades_db
    ]

    factor_obj = await obtener_factor_por_nivel(session, input_data.nivel_riesgo_arl)
    if factor_obj is None:
        raise ValueError(
            f"No hay factor prestacional vigente para nivel ARL '{input_data.nivel_riesgo_arl}'."
        )

    # La autorización se resuelve en el router (que inyecta advertencia al cliente).
    return calcular_pre_liquidacion(input_data, catalogo, factor_obj.factor_prestacional)


def _aplicar_registro_diario(input_data: PreLiquidacionInput) -> PreLiquidacionInput:
    """
    Deriva horas_por_dia del registro reloj (entrada/salida/almuerzo).

    Reglas:
      - Días libres (hora_entrada o hora_salida null) → 0h trabajadas.
      - (hora_salida - hora_entrada) da minutos brutos; se resta minutos_almuerzo.
      - Resultado se redondea a 2 decimales (cuarto de hora).
      - registro_diario debe estar ordenado por dia_semana 1..7 (L-D); si no,
        se reordena para alinear con horas_por_dia.
    """
    from ...models.novedades_nomina.schemas_horas_extras import RegistroDiarioInput  # noqa: F401

    if len(input_data.registro_diario or []) != 7:
        raise ValueError("registro_diario debe tener exactamente 7 entradas (L-D)")

    ordenados: List[RegistroDiarioInput] = sorted(
        input_data.registro_diario, key=lambda r: r.dia_semana
    )
    nuevas_horas: List[float] = []
    for i, r in enumerate(ordenados):
        if r.dia_semana != i + 1:
            raise ValueError(
                f"registro_diario debe cubrir días 1-7 consecutivos; falta día {i + 1}"
            )
        if r.hora_entrada is None or r.hora_salida is None:
            nuevas_horas.append(0.0)
            continue
        minutos_brutos = (
            (r.hora_salida.hour * 60 + r.hora_salida.minute)
            - (r.hora_entrada.hour * 60 + r.hora_entrada.minute)
        )
        if minutos_brutos < 0:
            raise ValueError(
                f"registro_diario[{i + 1}]: hora_salida debe ser posterior a hora_entrada"
            )
        minutos_efectivos = minutos_brutos - r.minutos_almuerzo
        nuevas_horas.append(round(max(0.0, minutos_efectivos / 60.0), 2))

    # Reemplazamos horas_por_dia in-place (es mutable en SQLModel).
    input_data.horas_por_dia = nuevas_horas
    return input_data


# ---------------------------------------------------------------------------
# CRUD de catálogo, horario, override, bolsa
# ---------------------------------------------------------------------------

async def crear_novedad_catalogo(
    session: AsyncSession, payload: NovedadCatalogoCreate
) -> NominaCatalogoNovedad:
    existente = (
        await session.execute(
            select(NominaCatalogoNovedad).where(
                NominaCatalogoNovedad.codigo == payload.codigo
            )
        )
    ).scalar_one_or_none()
    if existente is not None:
        raise ValueError(f"Ya existe la novedad '{payload.codigo}'")
    novedad = NominaCatalogoNovedad(**payload.model_dump())
    session.add(novedad)
    await session.commit()
    await session.refresh(novedad)
    return novedad


async def actualizar_novedad_catalogo(
    session: AsyncSession, codigo: str, payload: NovedadCatalogoCreate
) -> NominaCatalogoNovedad:
    novedad = (
        await session.execute(
            select(NominaCatalogoNovedad).where(NominaCatalogoNovedad.codigo == codigo)
        )
    ).scalar_one_or_none()
    if novedad is None:
        raise ValueError(f"No existe la novedad '{codigo}'")
    for k, v in payload.model_dump().items():
        setattr(novedad, k, v)
    novedad.actualizado_en = date.today()
    session.add(novedad)
    await session.commit()
    await session.refresh(novedad)
    return novedad


async def listar_factores_arl_todos(
    session: AsyncSession,
) -> List[NominaFactorPrestacionalRiesgo]:
    hoy = date.today()
    stmt = select(NominaFactorPrestacionalRiesgo).where(
        NominaFactorPrestacionalRiesgo.vigente_desde <= hoy
    ).order_by(NominaFactorPrestacionalRiesgo.nivel_riesgo)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def obtener_horario_pactado(
    session: AsyncSession, cedula: str
) -> Optional[NominaHorarioPactado]:
    return (
        await session.execute(
            select(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
        )
    ).scalar_one_or_none()


async def crear_override_autoriza_he(
    session: AsyncSession,
    payload: OverrideAutorizaHECreate,
    autorizado_por_id: Optional[str],
) -> NominaOverrideAutorizaHE:
    horario = await obtener_horario_pactado(session, payload.cedula)
    if horario is None:
        raise ValueError(
            f"No hay horario cacheado para '{payload.cedula}'. Sincronice primero."
        )

    # Revocar overrides activos previos
    activos_previos = (
        await session.execute(
            select(NominaOverrideAutorizaHE).where(
                NominaOverrideAutorizaHE.cedula == payload.cedula,
                NominaOverrideAutorizaHE.estado == "ACTIVO",
            )
        )
    ).scalars().all()
    for o in activos_previos:
        o.estado = "REVOCADO"

    nuevo = NominaOverrideAutorizaHE(
        cedula=payload.cedula,
        autoriza_he_erp=horario.autoriza_he_default,
        autoriza_he_override=payload.autoriza_he_override,
        motivo=payload.motivo,
        autorizado_por=payload.autorizado_por,
        autorizado_por_id=autorizado_por_id,
        vigente_hasta=payload.vigente_hasta,
        documento_soporte_url=payload.documento_soporte_url,
    )
    session.add(nuevo)
    await session.commit()
    await session.refresh(nuevo)
    return nuevo


async def listar_overrides_cedula(
    session: AsyncSession, cedula: str, estado: Optional[str] = None
) -> List[NominaOverrideAutorizaHE]:
    stmt = select(NominaOverrideAutorizaHE).where(
        NominaOverrideAutorizaHE.cedula == cedula
    )
    if estado:
        stmt = stmt.where(NominaOverrideAutorizaHE.estado == estado)
    stmt = stmt.order_by(NominaOverrideAutorizaHE.vigente_desde.desc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def obtener_bolsa_horas(
    session: AsyncSession, cedula: str
) -> Optional[NominaBolsaHoras]:
    return (
        await session.execute(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula)
        )
    ).scalar_one_or_none()
