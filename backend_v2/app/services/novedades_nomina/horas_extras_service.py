"""
Service layer principal del módulo de Horas Extras y Pre-liquidación.

Responsabilidad: orquestación con DB (cargar catálogo, factor, ejecutar cálculo)
y CRUD administrativo (catálogo, horario, override, bolsa).

El cálculo puro vive en `horas_extras_calculo.py` y la confirmación/lectura
vive en `horas_extras_confirmacion.py` para mantener cada archivo <500 líneas.
"""
import logging
from datetime import date, datetime, timedelta
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
from .festivos_service import listar_festivos
from .horas_extras_novedades import listar_novedades
from .horas_extras_parametros import obtener_reglas_calculo

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constantes de dominio — códigos de HE festiva
# ---------------------------------------------------------------------------
CODIGO_HE_FESTIVA_DIURNA = "HEFD"
CODIGO_HE_FESTIVA_NOCTURNA = "HEFN"
CODIGO_HORA_FESTIVA = "HF"
CODIGO_HE_DIURNA = "HED"
CODIGO_HE_NOCTURNA = "HEN"
CODIGOS_NOVEDAD_SUPRESION = {"VAC", "LIC", "INC", "AUS"}


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

    S5''' — cruza con festivos y novedades CONFIRMADAS de la semana:
      - Festivo → HEFD/HEFN en vez de HED/HEN
      - Novedad (VAC/LIC/INC/AUS) → 0h (suprime HE para ese día)
    """
    # Si el cliente mandó el registro reloj (entrada/salida/almuerzo), derivamos
    # las horas trabajadas por día. Esto refleja la UX natural: el usuario teclea
    # las horas del reloj y el sistema calcula, en lugar de forzar aritmética mental.
    if input_data.registro_diario is not None:
        input_data = _aplicar_registro_diario(input_data)

    # S5''' — Auto-inferir codigos_por_dia desde festivos y novedades confirmadas
    # de la semana. Si el cliente mandó codigos_por_dia explícito, se respeta como
    # override día a día (None en una posición = vuelve al default).
    input_data = await _aplicar_contexto_festivos_y_novedades(session, input_data)

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

    reglas_calculo = await obtener_reglas_calculo(session)

    # La autorización se resuelve en el router (que inyecta advertencia al cliente).
    return calcular_pre_liquidacion(
        input_data,
        catalogo,
        factor_obj.factor_prestacional,
        reglas_calculo,
    )


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
    from ...models.novedades_nomina.turnos import horas_jornada

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
        nuevas_horas.append(
            horas_jornada(
                r.hora_entrada,
                r.hora_salida,
                r.minutos_almuerzo,
                r.cruza_medianoche,
            )
        )

    # Reemplazamos horas_por_dia in-place (es mutable en SQLModel).
    input_data.horas_por_dia = nuevas_horas
    return input_data


# ---------------------------------------------------------------------------
# S5''' — Integración con festivos y novedades confirmadas
# ---------------------------------------------------------------------------

def _lunes_de_semana_iso(anio: int, semana_iso: int) -> date:
    """Devuelve el lunes (date) de la semana ISO (anio, semana_iso)."""
    return date.fromisocalendar(anio, semana_iso, 1)


async def _aplicar_contexto_festivos_y_novedades(
    session: AsyncSession,
    input_data: PreLiquidacionInput,
) -> PreLiquidacionInput:
    """
    Cruza la semana (anio, semana_iso) con festivos y novedades CONFIRMADAS
    para auto-armar `codigos_por_dia` y, si aplica, suprimir HE los días con
    novedad de tipo VAC/LIC/INC/AUS.

    Reglas:
      - Festivo + diurna → HF + HEFD
      - Festivo + nocturna → HF + HEFN
      - Novedad (VAC/LIC/INC/AUS) cubriendo el día → horas_por_dia=0, codigos=[]
        (la novedad manda sobre el festivo: si el lunes es festivo y la persona
         está de VAC ese día, no se devenga HEFD porque no trabajó).
      - Sin festivo ni novedad → respeta `input_data.codigos_por_dia[idx]`
        si el cliente lo envió; si no, default HED/HEN.
    """
    fecha_inicio = _lunes_de_semana_iso(input_data.anio, input_data.semana_iso)
    fecha_fin = fecha_inicio + timedelta(days=6)

    # Festivos del año, filtrados al rango de la semana
    festivos_set: set[date] = set()
    for anio_calendario in sorted({fecha_inicio.year, fecha_fin.year}):
        festivos_anio = await listar_festivos(
            session,
            anio_calendario,
            fuente="auto",
        )
        festivos_set.update(f["fecha"] for f in festivos_anio)

    # Novedades CONFIRMADAS que intersectan la semana (semántica overlap del listar)
    novedades_semana = await listar_novedades(
        session,
        cedula=input_data.cedula,
        fecha_desde=fecha_inicio,
        fecha_hasta=fecha_fin,
        estado="CONFIRMADO",
        limit=200,
    )

    # Indexar novedades por fecha: para cada día de la semana, qué códigos
    # de supresión aplican.
    novedades_por_fecha: dict[date, list[str]] = {fecha_inicio + timedelta(days=i): [] for i in range(7)}
    for n in novedades_semana:
        if n.codigo_novedad not in CODIGOS_NOVEDAD_SUPRESION:
            continue
        # Expandir el rango de la novedad sobre los días 1..7 que toca
        d = max(n.fecha_inicio, fecha_inicio)
        fin = min(n.fecha_fin, fecha_fin)
        while d <= fin:
            if d in novedades_por_fecha:
                if n.codigo_novedad not in novedades_por_fecha[d]:
                    novedades_por_fecha[d].append(n.codigo_novedad)
            d = d + timedelta(days=1)

    # Si el cliente mandó codigos_por_dia, lo respetamos. Si no, lista vacía
    # (la función pura del motor le pone HED/HEN por defecto).
    enviado = input_data.codigos_por_dia
    if enviado is None:
        enviado = [None] * 7
    else:
        enviado = list(enviado) + [None] * (7 - len(enviado))

    nuevos_codigos: List[Optional[List[str]]] = []
    horas = list(input_data.horas_por_dia) + [0.0] * (7 - len(input_data.horas_por_dia))
    nuevas_horas: List[float] = []

    for dia_idx in range(7):
        fecha = fecha_inicio + timedelta(days=dia_idx)
        supresiones = novedades_por_fecha.get(fecha, [])
        if supresiones:
            # Novedad manda: 0h trabajadas, sin códigos de HE
            nuevas_horas.append(0.0)
            nuevos_codigos.append([])
        elif fecha in festivos_set:
            # Festivo: HF para la porción ordinaria y HEFD/HEFN para excedentes.
            nuevos_codigos.append(
                [
                    CODIGO_HORA_FESTIVA,
                    CODIGO_HE_FESTIVA_NOCTURNA if input_data.es_jornada_nocturna else CODIGO_HE_FESTIVA_DIURNA,
                ]
            )
            nuevas_horas.append(horas[dia_idx])
        else:
            # Día normal: respetar lo enviado o None (motor pone HED/HEN)
            nuevos_codigos.append(enviado[dia_idx])
            nuevas_horas.append(horas[dia_idx])

    input_data.horas_por_dia = nuevas_horas
    input_data.codigos_por_dia = nuevos_codigos  # type: ignore[assignment]
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
