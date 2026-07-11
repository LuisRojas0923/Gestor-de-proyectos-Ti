"""
S5 — Router de eventos de novedades (LIC, VAC, INC, AUS, PNR, RET, SAN, DXT).

Mantiene su propio router con el mismo prefijo '/horas-extras' para poder
incluirse desde `horas_extras.py` sin reescribir la lógica de permisos y
mantener el archivo principal bajo el límite de 500 líneas.

Endpoints:
  GET    /horas-extras/novedades                 Lista eventos (filtros: cedula, codigo, fechas, estado)
  POST   /horas-extras/novedades                 Crea evento en BORRADOR
  GET    /horas-extras/novedades/{id}            Obtiene un evento
  PATCH  /horas-extras/novedades/{id}            Edita evento (solo BORRADOR)
  POST   /horas-extras/novedades/{id}/confirmar  Pasa a CONFIRMADO
  POST   /horas-extras/novedades/{id}/anular     Pasa a ANULADO (requiere justificación)
"""
import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_horas_extras import (
    NovedadEventoCreate,
    NovedadEventoRead,
    NovedadEventoUpdate,
    NovedadEventoList,
    NovedadEventoListItem,
    NovedadAnularRequest,
)
from ....services.novedades_nomina.horas_extras_novedades import (
    crear_novedad_evento,
    listar_novedades,
    obtener_novedad,
    actualizar_novedad,
    confirmar_novedad,
    anular_novedad,
)
from ....services.auth.alcance_empleados_service import (
    autorizar_cedula, autorizar_novedad_id, cedulas_permitidas,
)
from .horas_extras_permisos import (
    requiere_permiso_he_confirmar,
    requiere_permiso_he_leer,
    requiere_permiso_he_planificar,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _usuario_id(usuario: Usuario) -> str:
    return getattr(usuario, "cedula", None) or usuario.id


@router.get(
    "/novedades",
    response_model=NovedadEventoList,
    dependencies=[Depends(requiere_permiso_he_leer)],
)
async def listar_novedades_endpoint(
    cedula: Optional[str] = Query(None, max_length=50),
    codigo: Optional[str] = Query(None, max_length=20),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    estado: Optional[str] = Query(None, pattern="^(BORRADOR|CONFIRMADO|ANULADO)$"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    """
    Lista eventos de novedades con filtros opcionales.

    Solo aparecen novedades de categorías S5 (AUSENCIA, LICENCIA, VACACION,
    INCAPACIDAD). REM/RETIRO queda fuera de este endpoint.
    """
    permitidas = await cedulas_permitidas(db, usuario)
    if cedula:
        try:
            cedula = await autorizar_cedula(db, usuario, cedula)
        except (PermissionError, ValueError) as exc:
            raise HTTPException(404, "Recurso no encontrado") from exc
    items = await listar_novedades(
        db,
        cedula=cedula,
        codigo=codigo,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        estado=estado,
        limit=limit,
        offset=offset,
        cedulas_permitidas=permitidas,
    )
    return NovedadEventoList(
        items=[NovedadEventoListItem.model_validate(i) for i in items],
        total=len(items),
        limit=limit,
        offset=offset,
    )


@router.post(
    "/novedades",
    response_model=NovedadEventoRead,
    status_code=201,
    dependencies=[Depends(requiere_permiso_he_planificar)],
)
async def crear_novedad_endpoint(
    payload: NovedadEventoCreate,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_planificar),
):
    """Crea un evento en BORRADOR. Valida catálogo, horario y solapamiento."""
    try:
        payload.cedula = await autorizar_cedula(db, usuario, payload.cedula)
        evento = await crear_novedad_evento(db, payload, _usuario_id(usuario))
    except PermissionError as exc:
        raise HTTPException(404, "Recurso no encontrado") from exc
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return evento


@router.get(
    "/novedades/{novedad_id}",
    response_model=NovedadEventoRead,
    dependencies=[Depends(requiere_permiso_he_leer)],
)
async def obtener_novedad_endpoint(
    novedad_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_leer),
):
    try:
        await autorizar_novedad_id(db, usuario, novedad_id)
    except LookupError as exc:
        raise HTTPException(404, "Recurso no encontrado") from exc
    evento = await obtener_novedad(db, novedad_id)
    if evento is None:
        raise HTTPException(status_code=404, detail=f"Novedad {novedad_id} no existe")
    return evento


@router.patch(
    "/novedades/{novedad_id}",
    response_model=NovedadEventoRead,
    dependencies=[Depends(requiere_permiso_he_planificar)],
)
async def actualizar_novedad_endpoint(
    novedad_id: int = Path(..., ge=1),
    payload: NovedadEventoUpdate = ...,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_planificar),
):
    """Edita un evento. Solo permitido en estado BORRADOR."""
    try:
        await autorizar_novedad_id(db, usuario, novedad_id)
        if payload.cedula is not None:
            payload.cedula = await autorizar_cedula(db, usuario, payload.cedula)
        return await actualizar_novedad(db, novedad_id, payload, _usuario_id(usuario))
    except (LookupError, PermissionError) as exc:
        raise HTTPException(404, "Recurso no encontrado") from exc
    except ValueError as e:
        # 404 si no existe, 409 si no es BORRADOR o solapa
        if "no existe" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=409, detail=str(e))


@router.post(
    "/novedades/{novedad_id}/confirmar",
    response_model=NovedadEventoRead,
    dependencies=[Depends(requiere_permiso_he_confirmar)],
)
async def confirmar_novedad_endpoint(
    novedad_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_confirmar),
):
    """Confirma una novedad: BORRADOR → CONFIRMADO. Es la fuente oficial."""
    try:
        await autorizar_novedad_id(db, usuario, novedad_id)
        return await confirmar_novedad(db, novedad_id, _usuario_id(usuario))
    except LookupError as exc:
        raise HTTPException(404, "Recurso no encontrado") from exc
    except ValueError as e:
        if "no existe" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=409, detail=str(e))


@router.post(
    "/novedades/{novedad_id}/anular",
    response_model=NovedadEventoRead,
    dependencies=[Depends(requiere_permiso_he_confirmar)],
)
async def anular_novedad_endpoint(
    novedad_id: int = Path(..., ge=1),
    payload: NovedadAnularRequest = ...,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_confirmar),
):
    """Anula una novedad. Requiere justificación. Estado terminal."""
    try:
        await autorizar_novedad_id(db, usuario, novedad_id)
        return await anular_novedad(db, novedad_id, payload.justificacion, _usuario_id(usuario))
    except LookupError as exc:
        raise HTTPException(404, "Recurso no encontrado") from exc
    except ValueError as e:
        if "no existe" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=409, detail=str(e))
