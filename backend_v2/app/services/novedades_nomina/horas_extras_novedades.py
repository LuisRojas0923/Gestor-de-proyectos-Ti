"""
Service de eventos de novedades (Sprint S5).

Responsabilidades:
  - CRUD de NominaNovedadEvento (captura de LIC, VAC, INC, AUS, PNR, RET, SAN, DXT).
  - Validaciones de negocio:
      * codigo_novedad existe en nomina_catalogo_novedades
      * categoria ∈ {AUSENCIA, LICENCIA, VACACION, INCAPACIDAD}
      * empleado tiene horario_pactado vigente
      * fecha_fin >= fecha_inicio
      * no solapamiento con evento activo (no ANULADO) del mismo codigo+cedula
  - Workflow: BORRADOR → CONFIRMADO → ANULADO. ANULADO es terminal y requiere
    justificación.

Decisión: este sprint NO integra las novedades con el motor de pre-liquidación
(esa pieza es S5b: cada categoría tiene reglas distintas). Aquí solo capturamos
y validamos.
"""
import logging
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ...models.novedades_nomina.horas_extras import (
    NominaCatalogoNovedad,
    NominaHorarioPactado,
)
from ...models.novedades_nomina.horas_extras_novedad_evento import NominaNovedadEvento
from ...models.novedades_nomina.schemas_horas_extras import (
    NovedadEventoCreate,
    NovedadEventoUpdate,
    NovedadEstadoEnum,
)

logger = logging.getLogger(__name__)

# Categorías que entran en S5. REM queda fuera (es S5c: cambia estado del empleado).
CATEGORIAS_S5 = {"AUSENCIA", "LICENCIA", "VACACION", "INCAPACIDAD"}

ESTADOS_TERMINALES = {NovedadEstadoEnum.ANULADO.value}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _codigo_existe_y_es_valido(
    session: AsyncSession, codigo: str
) -> Optional[NominaCatalogoNovedad]:
    """Devuelve la fila del catálogo si existe y pertenece a S5; None si no."""
    cat = (
        await session.execute(
            select(NominaCatalogoNovedad).where(NominaCatalogoNovedad.codigo == codigo)
        )
    ).scalar_one_or_none()
    if cat is None:
        return None
    if cat.categoria not in CATEGORIAS_S5:
        return None
    if cat.estado != "ACTIVO":
        return None
    return cat


async def _empleado_tiene_horario(
    session: AsyncSession, cedula: str
) -> bool:
    """True si el empleado tiene horario_pactado registrado."""
    hp = (
        await session.execute(
            select(NominaHorarioPactado.id).where(NominaHorarioPactado.cedula == cedula)
        )
    ).scalar_one_or_none()
    return hp is not None


async def _hay_solapamiento(
    session: AsyncSession,
    cedula: str,
    codigo: str,
    fecha_inicio: date,
    fecha_fin: date,
    exclude_id: Optional[int] = None,
) -> bool:
    """
    Detecta si existe un evento NO anulado del mismo (cedula, codigo) que
    solape con [fecha_inicio, fecha_fin].

    Dos rangos [a,b] y [c,d] se solapan si a <= d AND c <= b.
    """
    stmt = select(NominaNovedadEvento).where(
        NominaNovedadEvento.cedula == cedula,
        NominaNovedadEvento.codigo_novedad == codigo,
        NominaNovedadEvento.estado != NovedadEstadoEnum.ANULADO.value,
        and_(
            NominaNovedadEvento.fecha_inicio <= fecha_fin,
            NominaNovedadEvento.fecha_fin >= fecha_inicio,
        ),
    )
    if exclude_id is not None:
        stmt = stmt.where(NominaNovedadEvento.id != exclude_id)
    existente = (await session.execute(stmt)).scalars().first()
    return existente is not None


# ---------------------------------------------------------------------------
# Crear
# ---------------------------------------------------------------------------

async def crear_novedad_evento(
    session: AsyncSession,
    payload: NovedadEventoCreate,
    usuario_id: Optional[str],
    confirmar_transaccion: bool = True,
) -> NominaNovedadEvento:
    cat = await _codigo_existe_y_es_valido(session, payload.codigo_novedad)
    if cat is None:
        raise ValueError(
            f"El código '{payload.codigo_novedad}' no existe o no es una novedad soportada en S5"
        )

    if payload.fecha_fin < payload.fecha_inicio:
        raise ValueError("fecha_fin debe ser >= fecha_inicio")

    if not await _empleado_tiene_horario(session, payload.cedula):
        raise ValueError(
            f"El empleado {payload.cedula} no tiene horario_pactado registrado"
        )

    if await _hay_solapamiento(
        session,
        payload.cedula,
        payload.codigo_novedad,
        payload.fecha_inicio,
        payload.fecha_fin,
    ):
        raise ValueError(
            f"Ya existe una novedad activa '{payload.codigo_novedad}' que solapa con este rango"
        )

    evento = NominaNovedadEvento(
        cedula=payload.cedula,
        codigo_novedad=payload.codigo_novedad,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        observaciones=payload.observaciones,
        estado=NovedadEstadoEnum.BORRADOR.value,
        created_by=usuario_id,
    )
    session.add(evento)
    if confirmar_transaccion:
        await session.commit()
        await session.refresh(evento)
    else:
        await session.flush()
    return evento


# ---------------------------------------------------------------------------
# Listar / Obtener
# ---------------------------------------------------------------------------

async def listar_novedades(
    session: AsyncSession,
    cedula: Optional[str] = None,
    codigo: Optional[str] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    estado: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    cedulas_permitidas: Optional[set[str]] = None,
) -> List[NominaNovedadEvento]:
    stmt = select(NominaNovedadEvento)
    if cedulas_permitidas is not None:
        if not cedulas_permitidas:
            return []
        stmt = stmt.where(NominaNovedadEvento.cedula.in_(cedulas_permitidas))
    if cedula:
        stmt = stmt.where(NominaNovedadEvento.cedula == cedula)
    if codigo:
        stmt = stmt.where(NominaNovedadEvento.codigo_novedad == codigo)
    if estado:
        stmt = stmt.where(NominaNovedadEvento.estado == estado)
    if fecha_desde:
        stmt = stmt.where(NominaNovedadEvento.fecha_fin >= fecha_desde)
    if fecha_hasta:
        stmt = stmt.where(NominaNovedadEvento.fecha_inicio <= fecha_hasta)
    stmt = (
        stmt.order_by(NominaNovedadEvento.fecha_inicio.desc(), NominaNovedadEvento.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list((await session.execute(stmt)).scalars().all())


async def obtener_novedad(
    session: AsyncSession, novedad_id: int
) -> Optional[NominaNovedadEvento]:
    return (
        await session.execute(
            select(NominaNovedadEvento).where(NominaNovedadEvento.id == novedad_id)
        )
    ).scalar_one_or_none()


# ---------------------------------------------------------------------------
# Actualizar (solo BORRADOR)
# ---------------------------------------------------------------------------

async def actualizar_novedad(
    session: AsyncSession,
    novedad_id: int,
    payload: NovedadEventoUpdate,
    usuario_id: Optional[str],
) -> NominaNovedadEvento:
    evento = await obtener_novedad(session, novedad_id)
    if evento is None:
        raise ValueError(f"Novedad {novedad_id} no existe")
    if evento.estado != NovedadEstadoEnum.BORRADOR.value:
        raise ValueError(
            f"Solo se pueden editar novedades en BORRADOR (actual: {evento.estado})"
        )

    # Validar nuevo rango si cambió
    nueva_fi = payload.fecha_inicio or evento.fecha_inicio
    nueva_ff = payload.fecha_fin or evento.fecha_fin
    if nueva_ff < nueva_fi:
        raise ValueError("fecha_fin debe ser >= fecha_inicio")

    nuevo_codigo = payload.codigo_novedad or evento.codigo_novedad
    if payload.codigo_novedad and payload.codigo_novedad != evento.codigo_novedad:
        cat = await _codigo_existe_y_es_valido(session, payload.codigo_novedad)
        if cat is None:
            raise ValueError(
                f"El código '{payload.codigo_novedad}' no existe o no es una novedad soportada en S5"
            )

    if (nueva_fi, nueva_ff, nuevo_codigo) != (
        evento.fecha_inicio,
        evento.fecha_fin,
        evento.codigo_novedad,
    ):
        if await _hay_solapamiento(
            session,
            evento.cedula,
            nuevo_codigo,
            nueva_fi,
            nueva_ff,
            exclude_id=evento.id,
        ):
            raise ValueError(
                f"Ya existe una novedad activa '{nuevo_codigo}' que solapa con este rango"
            )

    if payload.cedula is not None and payload.cedula != evento.cedula:
        if not await _empleado_tiene_horario(session, payload.cedula):
            raise ValueError(
                f"El empleado {payload.cedula} no tiene horario_pactado registrado"
            )

    # Aplicar cambios
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(evento, k, v)
    evento.updated_at = datetime.utcnow()
    evento.updated_by = usuario_id

    await session.commit()
    await session.refresh(evento)
    return evento


# ---------------------------------------------------------------------------
# Workflow: confirmar / anular
# ---------------------------------------------------------------------------

async def confirmar_novedad(
    session: AsyncSession,
    novedad_id: int,
    usuario_id: Optional[str],
) -> NominaNovedadEvento:
    evento = await obtener_novedad(session, novedad_id)
    if evento is None:
        raise ValueError(f"Novedad {novedad_id} no existe")
    if evento.estado != NovedadEstadoEnum.BORRADOR.value:
        raise ValueError(
            f"Solo se pueden confirmar novedades en BORRADOR (actual: {evento.estado})"
        )
    evento.estado = NovedadEstadoEnum.CONFIRMADO.value
    evento.confirmado_at = datetime.utcnow()
    evento.confirmado_by = usuario_id
    evento.updated_at = datetime.utcnow()
    evento.updated_by = usuario_id
    await session.commit()
    await session.refresh(evento)
    return evento


async def anular_novedad(
    session: AsyncSession,
    novedad_id: int,
    justificacion: str,
    usuario_id: Optional[str],
) -> NominaNovedadEvento:
    evento = await obtener_novedad(session, novedad_id)
    if evento is None:
        raise ValueError(f"Novedad {novedad_id} no existe")
    if evento.estado == NovedadEstadoEnum.ANULADO.value:
        raise ValueError("La novedad ya está anulada")
    if not justificacion or len(justificacion.strip()) < 5:
        raise ValueError("La anulación requiere una justificación (mínimo 5 caracteres)")

    evento.estado = NovedadEstadoEnum.ANULADO.value
    evento.anulado_at = datetime.utcnow()
    evento.anulado_justificacion = justificacion.strip()
    evento.updated_at = datetime.utcnow()
    evento.updated_by = usuario_id
    await session.commit()
    await session.refresh(evento)
    return evento
