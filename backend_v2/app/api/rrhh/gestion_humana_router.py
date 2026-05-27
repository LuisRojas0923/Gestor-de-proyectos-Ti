"""
Router de Gestión Humana para el módulo Requisición de Personal (RP).
Solo accesible para usuarios con rol GESTION_HUMANA.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import obtener_db
from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP
from app.api.rrhh.schemas import RequisicionOut, ActualizarEstadoGHPayload
import app.services.rrhh.requisicion_service as svc

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
        .order_by(RequisicionPersonal.fecha_decision_aprobador.desc())
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
        # TODO: extraer nombre/email del responsable del token JWT
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
