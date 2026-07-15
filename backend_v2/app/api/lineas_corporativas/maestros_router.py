import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.lineas_corporativas.schemas import (
    EmpleadoLineaCreate,
    EmpleadoLineaOut,
    EmpleadoLineaUpdate,
    EquipoMovilCreate,
    EquipoMovilOut,
    EquipoMovilUpdate,
)
from app.api.lineas_corporativas.dependencies import (
    requiere_administrador_lineas_corporativas,
)
from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.services.auditoria.snapshots import (
    asignar_actualizacion_segura,
    asignar_creacion_segura,
    asignar_eliminacion_segura,
    asignar_evento_segura,
)
from app.services.lineas_corporativas.maestros_service import (
    ConflictoIntegridadLineas,
    ErrorPersistenciaLineas,
    LineasCorporativasMaestrosService,
    RecursoEnUsoLineas,
    RecursoNoEncontradoLineas,
)


logger = logging.getLogger(__name__)
router = APIRouter()


def _evento(request: Request, accion: str, tipo: str, identificador: str) -> None:
    asignar_evento_segura(
        request,
        modulo="lineas_corporativas",
        accion=accion,
        entidad_tipo=tipo,
        entidad_id=identificador,
    )


def _traducir_error(exc: Exception) -> HTTPException:
    if isinstance(exc, RecursoNoEncontradoLineas):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, RecursoEnUsoLineas):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, ConflictoIntegridadLineas):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, ErrorPersistenciaLineas):
        return HTTPException(status_code=500, detail="Error interno al guardar el registro")
    logger.error("Error no controlado en maestros de líneas corporativas")
    return HTTPException(status_code=500, detail="Error interno al procesar el registro")


@router.get("/equipos", response_model=List[EquipoMovilOut])
async def listar_equipos(db: AsyncSession = Depends(obtener_db)):
    try:
        return await LineasCorporativasMaestrosService.listar_equipos(db)
    except Exception as exc:
        raise _traducir_error(exc) from exc


@router.post("/equipos", response_model=EquipoMovilOut, status_code=status.HTTP_201_CREATED)
async def crear_equipo(
    equipo_in: EquipoMovilCreate,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    try:
        equipo = await LineasCorporativasMaestrosService.crear_equipo(db, equipo_in)
    except Exception as exc:
        raise _traducir_error(exc) from exc
    _evento(request, "crear", "equipo_movil", str(equipo.id))
    asignar_creacion_segura(request, equipo)
    return equipo


@router.put("/equipos/{equipo_id}", response_model=EquipoMovilOut)
async def actualizar_equipo(
    equipo_id: int,
    equipo_in: EquipoMovilUpdate,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    try:
        equipo, antes = await LineasCorporativasMaestrosService.actualizar_equipo(
            db, equipo_id, equipo_in
        )
    except Exception as exc:
        raise _traducir_error(exc) from exc
    _evento(request, "actualizar", "equipo_movil", str(equipo_id))
    asignar_actualizacion_segura(request, antes, equipo)
    return equipo


@router.delete("/equipos/{equipo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_equipo(
    equipo_id: int,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    try:
        antes = await LineasCorporativasMaestrosService.eliminar_equipo(db, equipo_id)
    except Exception as exc:
        raise _traducir_error(exc) from exc
    _evento(request, "eliminar", "equipo_movil", str(equipo_id))
    asignar_eliminacion_segura(request, antes)


@router.get("/personas", response_model=List[EmpleadoLineaOut])
async def listar_personas(db: AsyncSession = Depends(obtener_db)):
    try:
        return await LineasCorporativasMaestrosService.listar_personas(db)
    except Exception as exc:
        raise _traducir_error(exc) from exc


@router.post("/personas", response_model=EmpleadoLineaOut, status_code=status.HTTP_201_CREATED)
async def crear_persona(
    persona_in: EmpleadoLineaCreate,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    try:
        persona = await LineasCorporativasMaestrosService.crear_persona(db, persona_in)
    except Exception as exc:
        raise _traducir_error(exc) from exc
    _evento(request, "crear", "persona_linea", persona.documento)
    asignar_creacion_segura(request, persona)
    return persona


@router.put("/personas/{documento}", response_model=EmpleadoLineaOut)
async def actualizar_persona(
    documento: str,
    persona_in: EmpleadoLineaUpdate,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    try:
        persona, antes = await LineasCorporativasMaestrosService.actualizar_persona(
            db, documento, persona_in
        )
    except Exception as exc:
        raise _traducir_error(exc) from exc
    _evento(request, "actualizar", "persona_linea", documento)
    asignar_actualizacion_segura(request, antes, persona)
    return persona


@router.delete("/personas/{documento}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_persona(
    documento: str,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    try:
        antes = await LineasCorporativasMaestrosService.eliminar_persona(db, documento)
    except Exception as exc:
        raise _traducir_error(exc) from exc
    _evento(request, "eliminar", "persona_linea", documento)
    asignar_eliminacion_segura(request, antes)
