"""
Router de aprobación para el módulo Requisición de Personal (RP).
Endpoints exclusivos del gerente aprobador.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import obtener_db
from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP
from app.api.rrhh.schemas import RequisicionOut, AprobarPayload, RechazarPayload, DevolverPayload
import app.services.rrhh.requisicion_service as svc
import app.services.rrhh.email_rp_service as mail

router = APIRouter(prefix="/requisiciones", tags=["RP — Aprobación"])


@router.get("/bandeja-aprobador", response_model=List[RequisicionOut])
async def bandeja_aprobador(
    aprobador_email: str,
    db: AsyncSession = Depends(obtener_db),
):
    """
    Lista las requisiciones pendientes asignadas al aprobador autenticado.
    El email se extrae del token JWT en producción; aquí se recibe como param por simplicidad.
    """
    result = await db.execute(
        select(RequisicionPersonal).where(
            RequisicionPersonal.estado == EstadoRP.PENDIENTE_APROBACION,
            RequisicionPersonal.aprobador_email == aprobador_email,
        ).order_by(RequisicionPersonal.fecha_radicacion)
    )
    return result.scalars().all()


@router.post("/{requisicion_id}/aprobar", response_model=RequisicionOut)
async def aprobar(
    requisicion_id: int,
    payload: AprobarPayload,
    db: AsyncSession = Depends(obtener_db),
):
    """Aprueba la requisición y notifica al solicitante y a GH."""
    try:
        # TODO: extraer nombre/email del aprobador del token JWT
        aprobador_nombre = "Gerente Aprobador"
        aprobador_email = "aprobador@refridcol.com"

        req = await svc.aprobar_requisicion(
            db, requisicion_id, aprobador_nombre, aprobador_email, payload.observacion
        )
        # Notificaciones asíncronas (no bloqueantes)
        try:
            await mail.notificar_aprobada(req)
            await mail.notificar_gestion_humana(req)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[RP Email] Error en notificación: {e}")

        return req
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{requisicion_id}/rechazar", response_model=RequisicionOut)
async def rechazar(
    requisicion_id: int,
    payload: RechazarPayload,
    db: AsyncSession = Depends(obtener_db),
):
    """Rechaza la requisición con observación obligatoria y notifica al solicitante."""
    try:
        aprobador_nombre = "Gerente Aprobador"
        aprobador_email = "aprobador@refridcol.com"

        req = await svc.rechazar_requisicion(
            db, requisicion_id, aprobador_nombre, aprobador_email, payload.observacion
        )
        try:
            await mail.notificar_rechazada(req, payload.observacion)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[RP Email] Error en notificación: {e}")

        return req
    except (PermissionError, ValueError) as e:
        status_code = 403 if isinstance(e, PermissionError) else 404
        raise HTTPException(status_code=status_code, detail=str(e))


@router.post("/{requisicion_id}/devolver", response_model=RequisicionOut)
async def devolver(
    requisicion_id: int,
    payload: DevolverPayload,
    db: AsyncSession = Depends(obtener_db),
):
    """Devuelve la requisición para ajuste con observación obligatoria."""
    try:
        aprobador_nombre = "Gerente Aprobador"
        aprobador_email = "aprobador@refridcol.com"

        req = await svc.devolver_requisicion(
            db, requisicion_id, aprobador_nombre, aprobador_email, payload.observacion
        )
        try:
            await mail.notificar_devuelta(req, payload.observacion)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[RP Email] Error en notificación: {e}")

        return req
    except (PermissionError, ValueError) as e:
        status_code = 403 if isinstance(e, PermissionError) else 404
        raise HTTPException(status_code=status_code, detail=str(e))
