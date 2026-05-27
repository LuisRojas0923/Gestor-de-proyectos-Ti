"""
Router de Gestión Humana para el módulo Requisición de Personal (RP).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import obtener_db
from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP
from app.api.rrhh.schemas import (
    RequisicionOut, ActualizarEstadoGHPayload,
    EmpresaTemporalOut, EmpresaTemporalCreate, EmpresaTemporalUpdate,
    RequisicionTemporalOut, RequisicionTemporalAssignPayload, RequisicionTemporalEnvioHVPayload,
    CandidatoRequisicionOut, CandidatoRequisicionCreate, CandidatoRequisicionUpdate,
    SeguimientoStatsOut
)
import app.services.rrhh.requisicion_service as svc
import app.services.rrhh.seguimiento_service as seg_svc

router = APIRouter(prefix="/requisiciones", tags=["RP — Gestión Humana"])

# Estados visibles para Gestión Humana
ESTADOS_GH = [
    EstadoRP.APROBADA,
    EstadoRP.EN_PROCESO_SELECCION,
    EstadoRP.CANDIDATO_SELECCIONADO,
    EstadoRP.EN_PROCESO_CONTRATACION,
    EstadoRP.CERRADA,
    EstadoRP.CANCELADA,
]


@router.get("/bandeja-gestion-humana", response_model=List[RequisicionOut])
async def bandeja_gestion_humana(db: AsyncSession = Depends(obtener_db)):
    """
    Lista todas las requisiciones visibles para Gestión Humana
    (aprobadas y en cualquier etapa de gestión).
    """
    result = await db.execute(
        select(RequisicionPersonal)
        .where(RequisicionPersonal.estado.in_(ESTADOS_GH))
        .order_by(RequisicionPersonal.id.desc())
    )
    return result.scalars().all()


@router.post("/{requisicion_id}/gestion-humana/actualizar-estado", response_model=RequisicionOut)
async def actualizar_estado_gh(
    requisicion_id: int,
    payload: ActualizarEstadoGHPayload,
    db: AsyncSession = Depends(obtener_db),
):
    """
    Actualiza el estado de una requisición aprobada.
    Solo Gestión Humana puede mover entre: APROBADA → EN_PROCESO_SELECCION → CANDIDATO →
    EN_PROCESO_CONTRATACION → CERRADA / CANCELADA.
    """
    try:
        responsable_nombre = "Gestión Humana"
        responsable_email = "gestion.humana@refridcol.com"

        req = await svc.actualizar_estado_gh(
            db,
            requisicion_id,
            payload.nuevo_estado,
            responsable_nombre,
            responsable_email,
            payload.observacion,
        )
        return req
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── Catálogo de Temporales ─────────────────────
@router.get("/temporales", response_model=List[EmpresaTemporalOut])
async def listar_temporales(db: AsyncSession = Depends(obtener_db)):
    """Lista el catálogo de empresas temporales / contrataciones directas."""
    return await seg_svc.get_temporales(db)


@router.post("/temporales", response_model=EmpresaTemporalOut, status_code=status.HTTP_201_CREATED)
async def crear_temporal(payload: EmpresaTemporalCreate, db: AsyncSession = Depends(obtener_db)):
    """Agrega una nueva empresa temporal al catálogo."""
    try:
        return await seg_svc.create_temporal(db, payload.nombre)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/temporales/{id}", response_model=EmpresaTemporalOut)
async def actualizar_temporal(id: int, payload: EmpresaTemporalUpdate, db: AsyncSession = Depends(obtener_db)):
    """Actualiza una empresa temporal (modifica nombre o estado activo)."""
    try:
        return await seg_svc.update_temporal(db, id, payload.nombre, payload.activo)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/temporales/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_temporal(id: int, db: AsyncSession = Depends(obtener_db)):
    """Elimina una empresa temporal si no tiene relaciones asociadas."""
    try:
        await seg_svc.delete_temporal(db, id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── Asignación a Temporales ────────────────────
@router.get("/{requisicion_id}/temporales", response_model=List[RequisicionTemporalOut])
async def obtener_temporales_asignadas(requisicion_id: int, db: AsyncSession = Depends(obtener_db)):
    """Obtiene las empresas temporales asignadas a una requisición."""
    return await seg_svc.get_requisicion_temporales(db, requisicion_id)


@router.post("/{requisicion_id}/temporales", response_model=List[RequisicionTemporalOut])
async def asignar_temporales(
    requisicion_id: int,
    payload: RequisicionTemporalAssignPayload,
    db: AsyncSession = Depends(obtener_db),
):
    """Asigna la requisición a un conjunto de empresas temporales."""
    return await seg_svc.assign_requisicion_temporales(db, requisicion_id, payload.temporal_ids)


@router.put("/{requisicion_id}/temporales/{temporal_id}/envio-hv", response_model=RequisicionTemporalOut)
async def actualizar_fecha_envio_hv(
    requisicion_id: int,
    temporal_id: int,
    payload: RequisicionTemporalEnvioHVPayload,
    db: AsyncSession = Depends(obtener_db),
):
    """Registra o actualiza la fecha en que la temporal empezó a remitir hojas de vida."""
    try:
        return await seg_svc.update_temporal_envio_hv(db, requisicion_id, temporal_id, payload.fecha_envio_hv)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── Pipeline de Candidatos ─────────────────────
@router.get("/{requisicion_id}/candidatos", response_model=List[CandidatoRequisicionOut])
async def listar_candidatos(requisicion_id: int, db: AsyncSession = Depends(obtener_db)):
    """Lista todos los candidatos cargados para el proceso de selección de una requisición."""
    return await seg_svc.get_candidatos(db, requisicion_id)


@router.post("/{requisicion_id}/candidatos", response_model=CandidatoRequisicionOut, status_code=status.HTTP_201_CREATED)
async def agregar_candidato(
    requisicion_id: int,
    payload: CandidatoRequisicionCreate,
    db: AsyncSession = Depends(obtener_db),
):
    """Agrega un candidato al pipeline de selección de la requisición."""
    try:
        return await seg_svc.add_candidato(
            db, requisicion_id, payload.temporal_id, payload.nombre_candidato, payload.observaciones
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/candidatos/{candidato_id}", response_model=CandidatoRequisicionOut)
async def actualizar_candidato(
    candidato_id: int,
    payload: CandidatoRequisicionUpdate,
    db: AsyncSession = Depends(obtener_db),
):
    """Actualiza la información y el estado de un candidato (ej: POR_EVALUAR -> APLICA)."""
    try:
        data = payload.model_dump(exclude_unset=True)
        return await seg_svc.update_candidato(db, candidato_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ── Métricas de Seguimiento ────────────────────
@router.get("/{requisicion_id}/seguimiento-stats", response_model=SeguimientoStatsOut)
async def obtener_estadisticas_seguimiento(requisicion_id: int, db: AsyncSession = Depends(obtener_db)):
    """Calcula acumulados y estadísticas del pipeline de candidatos de la requisición."""
    return await seg_svc.get_seguimiento_stats(db, requisicion_id)
