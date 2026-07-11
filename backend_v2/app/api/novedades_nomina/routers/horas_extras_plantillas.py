"""Router del catalogo y aplicaciones de plantillas de horario."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_plantillas_horario import (
    AplicacionPlantillaRead,
    PlantillaHorarioAplicar,
    PlantillaHorarioCreate,
    PlantillaHorarioDuplicar,
    PlantillaHorarioList,
    PlantillaHorarioRead,
    PlantillaHorarioUpdate,
)
from ....services.novedades_nomina.plantillas_horario_service import (
    aplicar_plantilla,
    crear_plantilla,
    desactivar_plantilla,
    duplicar_plantilla,
    editar_plantilla,
    listar_plantillas,
    obtener_plantilla,
)
from ....services.auditoria.snapshots import asignar_evento_segura
from .horas_extras_permisos import (
    requiere_permiso_he_planificar,
    requiere_permiso_plantillas_administrar,
)

router = APIRouter(prefix="/plantillas-horario")
MODULO_PLANTILLAS = "nomina_horas_extras.plantillas_horario.administrar"


def _atribuir_auditoria(request: Request, plantilla_id: UUID | None = None) -> None:
    asignar_evento_segura(
        request,
        modulo=MODULO_PLANTILLAS,
        entidad_tipo="plantilla_horario",
        entidad_id=str(plantilla_id) if plantilla_id is not None else None,
    )


def _error(exc: Exception) -> HTTPException:
    if isinstance(exc, LookupError):
        return HTTPException(404, "Plantilla no encontrada")
    if isinstance(exc, (RuntimeError, IntegrityError)):
        return HTTPException(409, "Conflicto al modificar la plantilla")
    if isinstance(exc, PermissionError):
        return HTTPException(404, "Empleado no encontrado")
    if isinstance(exc, ValueError):
        return HTTPException(422, str(exc))
    return HTTPException(500, "Error al procesar la plantilla")


@router.get("", response_model=PlantillaHorarioList)
async def listar(
    limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
    incluir_inactivas: bool = False, q: str | None = Query(None, max_length=120),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_plantillas_administrar),
):
    items, total = await listar_plantillas(db, limit, offset, incluir_inactivas, q)
    return PlantillaHorarioList(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=PlantillaHorarioRead, status_code=201)
async def crear(
    payload: PlantillaHorarioCreate, request: Request,
    db: AsyncSession = Depends(obtener_db),
    actor: Usuario = Depends(requiere_permiso_plantillas_administrar),
):
    _atribuir_auditoria(request)
    request.state.auditoria_metadatos = {"cantidad_dias": len(payload.dias)}
    request.state.auditoria_datos_nuevos = dict(request.state.auditoria_metadatos)
    try:
        return await crear_plantilla(db, payload, actor)
    except Exception as exc:
        raise _error(exc) from exc


@router.get("/{plantilla_id}", response_model=PlantillaHorarioRead)
async def obtener(
    plantilla_id: UUID, db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_plantillas_administrar),
):
    try:
        return await obtener_plantilla(db, plantilla_id)
    except Exception as exc:
        raise _error(exc) from exc


@router.patch("/{plantilla_id}", response_model=PlantillaHorarioRead)
async def editar(
    plantilla_id: UUID, payload: PlantillaHorarioUpdate, request: Request,
    db: AsyncSession = Depends(obtener_db),
    actor: Usuario = Depends(requiere_permiso_plantillas_administrar),
):
    _atribuir_auditoria(request, plantilla_id)
    try:
        return await editar_plantilla(db, plantilla_id, payload, actor)
    except Exception as exc:
        raise _error(exc) from exc


@router.post("/{plantilla_id}/desactivar", response_model=PlantillaHorarioRead)
async def desactivar(
    plantilla_id: UUID, request: Request, db: AsyncSession = Depends(obtener_db),
    actor: Usuario = Depends(requiere_permiso_plantillas_administrar),
):
    _atribuir_auditoria(request, plantilla_id)
    try:
        return await desactivar_plantilla(db, plantilla_id, actor)
    except Exception as exc:
        raise _error(exc) from exc


@router.post("/{plantilla_id}/duplicar", response_model=PlantillaHorarioRead, status_code=201)
async def duplicar(
    plantilla_id: UUID, payload: PlantillaHorarioDuplicar, request: Request,
    db: AsyncSession = Depends(obtener_db),
    actor: Usuario = Depends(requiere_permiso_plantillas_administrar),
):
    _atribuir_auditoria(request, plantilla_id)
    request.state.auditoria_datos_nuevos = {"duplicacion": True}
    try:
        return await duplicar_plantilla(db, plantilla_id, payload.nombre, actor)
    except Exception as exc:
        raise _error(exc) from exc


@router.post("/{plantilla_id}/aplicaciones", response_model=AplicacionPlantillaRead)
async def aplicar(
    plantilla_id: UUID, payload: PlantillaHorarioAplicar, request: Request,
    db: AsyncSession = Depends(obtener_db),
    actor: Usuario = Depends(requiere_permiso_he_planificar),
):
    _atribuir_auditoria(request, plantilla_id)
    request.state.auditoria_metadatos = {"cantidad_empleados": len(payload.cedulas)}
    request.state.auditoria_datos_nuevos = dict(request.state.auditoria_metadatos)
    try:
        return await aplicar_plantilla(
            db, plantilla_id, payload.solicitud_id, payload.cedulas, actor
        )
    except Exception as exc:
        raise _error(exc) from exc
