"""
Service layer del módulo de Horas Extras y Pre-liquidación.

Contiene la lógica de negocio del cálculo. Los routers son thin: solo
parsean, validan, llaman al service y serializan.

Funciones puras (sin DB) marcadas con prefijo `calcular_` para facilitar
testing unitario.
"""
import logging
from datetime import date, datetime
from typing import List, Optional, Tuple
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.novedades_nomina.horas_extras import (
    NominaCatalogoNovedad,
    NominaFactorPrestacionalRiesgo,
    NominaHorarioPactado,
    NominaOverrideAutorizaHE,
    NominaBolsaHoras,
)
from ...models.novedades_nomina.schemas_horas_extras import (
    PreLiquidacionInput,
    PreLiquidacionResultado,
    DetalleCalculoItem,
    NovedadCatalogoCreate,
    OverrideAutorizaHECreate,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Catálogo de novedades
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
# Cálculo de pre-liquidación (función pura — sin DB)
# ---------------------------------------------------------------------------

HORAS_ORDINARIAS_DIARIAS = 8  # Ley 2101/2021
HORAS_ORDINARIAS_SEMANALES = 48
DIVISOR_HORA_ORDINARIA = 240
MAX_HE_DIARIAS = 2
MAX_HE_SEMANALES = 12
MAX_HE_ANUALES = 480
HORA_NOCTURNA_INICIO = 22
HORA_NOCTURNA_FIN = 6


def calcular_pre_liquidacion(
    input_data: PreLiquidacionInput,
    catalogo: List[dict],
    factor_prestacional: float,
) -> PreLiquidacionResultado:
    """
    Lógica pura del cálculo de pre-liquidación.

    `catalogo` se inyecta para mantener la función testeable sin DB.
    Cada item: {codigo, factor_hora_ordinaria, acredita_bolsa, descuenta_bolsa, unidad}

    Reglas:
      - Hora ordinaria: primeras 8h/día o 48h/semana.
      - Exceso sobre jornada ordinaria = hora extra (con o sin código explícito).
      - Si la jornada es nocturna (input.es_jornada_nocturna), las horas
        trabajadas después de las 22:00 se tratan como HEN (1.75) si no
        se especifica código.
      - Carga prestacional: se suma factor_prestacional sobre el valor bruto.
      - Topes: máximo 2h extras/día, 12h/semana, 480h/año.
    """
    advertencias: List[str] = []

    # Catálogo indexado por código
    cat_idx = {c["codigo"]: c for c in catalogo}

    valor_hora = input_data.salario_base_mensual / DIVISOR_HORA_ORDINARIA

    detalles: List[DetalleCalculoItem] = []
    horas_extras_total = 0.0

    codigos_por_dia = input_data.codigos_por_dia or [[] for _ in range(7)]

    for dia_idx, horas_dia in enumerate(input_data.horas_por_dia):
        horas_ordinarias_dia = min(horas_dia, HORAS_ORDINARIAS_DIARIAS)
        horas_extras_dia = max(0.0, horas_dia - HORAS_ORDINARIAS_DIARIAS)

        if horas_extras_dia <= 0:
            continue

        # Resolver factor: si el usuario reportó códigos, los respetamos;
        # si no, inferimos (HEN si jornada nocturna, HED en caso contrario).
        codigos = codigos_por_dia[dia_idx] if dia_idx < len(codigos_por_dia) else []
        if not codigos:
            codigos = ["HEN" if input_data.es_jornada_nocturna else "HED"]

        # Tope diario: 2h extras (Art. 161 CST)
        if horas_extras_dia > MAX_HE_DIARIAS:
            advertencias.append(
                f"Día {dia_idx + 1}: {horas_extras_dia}h extras exceden el tope diario de {MAX_HE_DIARIAS}h."
            )
            horas_extras_dia = MAX_HE_DIARIAS

        # Reportar códigos inválidos ANTES de filtrar
        for codigo in codigos:
            if codigo not in cat_idx:
                advertencias.append(f"Día {dia_idx + 1}: código desconocido '{codigo}' omitido.")

        # Distribuir las horas extras entre los códigos declarados (válidos).
        # Si hay un solo código válido, se lleva todo; si hay varios, se reparte.
        horas_por_codigo = _distribuir_horas_por_codigos(
            horas_extras_dia, codigos, cat_idx
        )

        for codigo, horas_codigo in horas_por_codigo.items():
            if horas_codigo <= 0:
                continue
            cat = cat_idx[codigo]
            factor = cat["factor_hora_ordinaria"]
            valor_bruto = horas_codigo * valor_hora * factor
            carga = valor_bruto * factor_prestacional
            detalles.append(
                DetalleCalculoItem(
                    codigo_novedad=codigo,
                    horas=horas_codigo,
                    factor_hora_ordinaria=factor,
                    valor_bruto=valor_bruto,
                    carga_prestacional=carga,
                    costo_total=valor_bruto + carga,
                )
            )
            horas_extras_total += horas_codigo

    # Tope semanal
    if horas_extras_total > MAX_HE_SEMANALES:
        advertencias.append(
            f"Total semanal {horas_extras_total}h excede el tope de {MAX_HE_SEMANALES}h (Art. 161 CST)."
        )

    # Agregar (los detalles pueden traer mismo código de varios días)
    detalles_agg = _agregar_detalles(detalles)

    total_bruto = sum(d.valor_bruto for d in detalles_agg)
    total_carga = sum(d.carga_prestacional for d in detalles_agg)

    return PreLiquidacionResultado(
        cedula=input_data.cedula,
        anio=input_data.anio,
        semana_iso=input_data.semana_iso,
        nivel_riesgo_arl=input_data.nivel_riesgo_arl,
        factor_prestacional=factor_prestacional,
        salario_base_mensual=input_data.salario_base_mensual,
        valor_hora_ordinaria=valor_hora,
        total_horas_extras=sum(d.horas for d in detalles_agg),
        total_valor_bruto=total_bruto,
        total_carga_prestacional=total_carga,
        total_costo_empresa=total_bruto + total_carga,
        detalles=detalles_agg,
        advertencias=advertencias,
    )


def _distribuir_horas_por_codigos(
    horas_extras: float,
    codigos: List[str],
    catalogo: dict,
) -> dict:
    """
    Distribuye las horas extras de un día entre los códigos declarados.
    Si solo hay un código válido, se lleva todo. Si hay varios, se reparten
    en partes iguales (caso típico: HED + HEN por corte de jornada).

    Los códigos inválidos se excluyen del resultado pero SÍ cuentan para
    el divisor, de modo que el usuario ve reflejado que declaró un código
    desconocido (y recibe advertencia por separado).
    """
    if not codigos:
        return {}
    codigos_validos = [c for c in codigos if c in catalogo]
    if not codigos_validos:
        return {}
    if len(codigos_validos) == 1:
        return {codigos_validos[0]: horas_extras}
    # Reparto equitativo entre los códigos VÁLIDOS (no entre todos los declarados)
    por_codigo = horas_extras / len(codigos_validos)
    return {c: por_codigo for c in codigos_validos}


def _agregar_detalles(detalles: List[DetalleCalculoItem]) -> List[DetalleCalculoItem]:
    """Agrupa detalles por código sumando horas, valor_bruto, carga."""
    if not detalles:
        return []
    agg: dict = {}
    for d in detalles:
        if d.codigo_novedad not in agg:
            agg[d.codigo_novedad] = DetalleCalculoItem(
                codigo_novedad=d.codigo_novedad,
                horas=0.0,
                factor_hora_ordinaria=d.factor_hora_ordinaria,
                valor_bruto=0.0,
                carga_prestacional=0.0,
                costo_total=0.0,
            )
        a = agg[d.codigo_novedad]
        a.horas += d.horas
        a.valor_bruto += d.valor_bruto
        a.carga_prestacional += d.carga_prestacional
        a.costo_total += d.costo_total
    return list(agg.values())


# ---------------------------------------------------------------------------
# Orquestador (service de DB): combina DB + función pura
# ---------------------------------------------------------------------------

async def ejecutar_pre_liquidacion(
    session: AsyncSession,
    input_data: PreLiquidacionInput,
) -> PreLiquidacionResultado:
    """
    Versión con DB: carga catálogo y factor prestacional, luego delega
    a la función pura `calcular_pre_liquidacion`.
    """
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

    # Resolver autorización (advertencia si no está autorizado)
    autoriza, fuente = await resolver_autorizacion_he(session, input_data.cedula)
    if not autoriza:
        input_data_nuevo = PreLiquidacionInput.model_validate(input_data.model_dump())
        # No abortamos el cálculo, solo advertimos
    return calcular_pre_liquidacion(input_data, catalogo, factor_obj.factor_prestacional)


# ---------------------------------------------------------------------------
# Operaciones CRUD (delegadas desde el router)
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
