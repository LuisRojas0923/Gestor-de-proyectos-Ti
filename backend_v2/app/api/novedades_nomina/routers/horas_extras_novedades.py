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
from ....api.auth.profile_router import obtener_usuario_actual_db
from ....models.auth.usuario import Usuario
from ....services.auth.servicio import ServicioAuth
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

logger = logging.getLogger(__name__)

MODULO_HE = "nomina_horas_extras"

router = APIRouter()


async def requiere_permiso_he(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_HE not in permisos:
        raise HTTPException(status_code=403, detail="Sin permiso para Horas Extras")
    return usuario


def _usuario_id(usuario: Usuario) -> str:
    return getattr(usuario, "cedula", None) or usuario.id


@router.get(
    "/novedades",
    response_model=NovedadEventoList,
    dependencies=[Depends(requiere_permiso_he)],
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
):
    """
    Lista eventos de novedades con filtros opcionales.

    Solo aparecen novedades de categorías S5 (AUSENCIA, LICENCIA, VACACION,
    INCAPACIDAD). REM/RETIRO queda fuera de este endpoint.
    """
    items = await listar_novedades(
        db,
        cedula=cedula,
        codigo=codigo,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        estado=estado,
        limit=limit,
        offset=offset,
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
    dependencies=[Depends(requiere_permiso_he)],
)
async def crear_novedad_endpoint(
    payload: NovedadEventoCreate,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he),
):
    """Crea un evento en BORRADOR. Valida catálogo, horario y solapamiento."""
    try:
        evento = await crear_novedad_evento(db, payload, _usuario_id(usuario))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return evento


@router.get(
    "/novedades/{novedad_id}",
    response_model=NovedadEventoRead,
    dependencies=[Depends(requiere_permiso_he)],
)
async def obtener_novedad_endpoint(
    novedad_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
):
    evento = await obtener_novedad(db, novedad_id)
    if evento is None:
        raise HTTPException(status_code=404, detail=f"Novedad {novedad_id} no existe")
    return evento


@router.patch(
    "/novedades/{novedad_id}",
    response_model=NovedadEventoRead,
    dependencies=[Depends(requiere_permiso_he)],
)
async def actualizar_novedad_endpoint(
    novedad_id: int = Path(..., ge=1),
    payload: NovedadEventoUpdate = ...,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he),
):
    """Edita un evento. Solo permitido en estado BORRADOR."""
    try:
        return await actualizar_novedad(db, novedad_id, payload, _usuario_id(usuario))
    except ValueError as e:
        # 404 si no existe, 409 si no es BORRADOR o solapa
        if "no existe" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=409, detail=str(e))


@router.post(
    "/novedades/{novedad_id}/confirmar",
    response_model=NovedadEventoRead,
    dependencies=[Depends(requiere_permiso_he)],
)
async def confirmar_novedad_endpoint(
    novedad_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he),
):
    """Confirma una novedad: BORRADOR → CONFIRMADO. Es la fuente oficial."""
    try:
        return await confirmar_novedad(db, novedad_id, _usuario_id(usuario))
    except ValueError as e:
        if "no existe" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=409, detail=str(e))


@router.post(
    "/novedades/{novedad_id}/anular",
    response_model=NovedadEventoRead,
    dependencies=[Depends(requiere_permiso_he)],
)
async def anular_novedad_endpoint(
    novedad_id: int = Path(..., ge=1),
    payload: NovedadAnularRequest = ...,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he),
):
    """Anula una novedad. Requiere justificación. Estado terminal."""
    try:
        return await anular_novedad(db, novedad_id, payload.justificacion, _usuario_id(usuario))
    except ValueError as e:
        if "no existe" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=409, detail=str(e))
