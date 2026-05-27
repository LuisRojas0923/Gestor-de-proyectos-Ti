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
from app.api.auth.router import obtener_usuario_actual_db
from app.models.auth.usuario import Usuario


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
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Aprueba la requisición a nivel Director de Área y notifica a la Gerencia para firma."""
    try:
        aprobador_nombre = usuario.nombre
        aprobador_email = usuario.correo or ""

        req = await svc.aprobar_requisicion(
            db, requisicion_id, aprobador_nombre, aprobador_email, payload.observacion
        )

        # Buscar correo de la gerente (cédula 66903320) para notificarle
        stmt_g = select(Usuario).where(Usuario.cedula == "66903320")
        res_g = await db.execute(stmt_g)
        gerente_user = res_g.scalars().first()
        
        gerente_email = gerente_user.correo if (gerente_user and gerente_user.correo) else "maribell.torres@refridcol.com"
        gerente_nombre = gerente_user.nombre if gerente_user else "Torres Agudelo Maribell"

        # Notificación asíncrona a Gerencia para firma
        try:
            await mail.notificar_gerencia(req, gerente_email, gerente_nombre)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[RP Email] Error al notificar firma de Gerencia: {e}")

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
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Rechaza la requisición con observación obligatoria y notifica al solicitante."""
    try:
        aprobador_nombre = usuario.nombre
        aprobador_email = usuario.correo or ""

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
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Devuelve la requisición para ajuste con observación obligatoria."""
    try:
        aprobador_nombre = usuario.nombre
        aprobador_email = usuario.correo or ""

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


# ──────────────────────────────────────────────
# Endpoints de la Gerente Administrativa y Financiera (Torres Agudelo Maribell)
# ──────────────────────────────────────────────

@router.get("/bandeja-gerente", response_model=List[RequisicionOut])
async def bandeja_gerente(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Lista las requisiciones aprobadas por directores pendientes de firma gerencial."""
    if usuario.cedula != "66903320" and usuario.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a la Gerente Administrativa y Financiera."
        )

    result = await db.execute(
        select(RequisicionPersonal).where(
            RequisicionPersonal.estado == EstadoRP.PENDIENTE_APROBACION_GERENCIA,
        ).order_by(RequisicionPersonal.fecha_decision_aprobador.desc())
    )
    return result.scalars().all()


@router.post("/{requisicion_id}/aprobar-gerente", response_model=RequisicionOut)
async def aprobar_gerencia(
    requisicion_id: int,
    payload: AprobarPayload,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Firmar y aprobar definitivamente a nivel Gerencial. Envía correos a solicitante y GH."""
    if usuario.cedula != "66903320" and usuario.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a la Gerente Administrativa y Financiera."
        )
    try:
        req = await svc.aprobar_gerente(
            db, requisicion_id, usuario.nombre, usuario.correo or "", payload.observacion
        )
        try:
            await mail.notificar_aprobada(req)
            await mail.notificar_gestion_humana(req)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[RP Email] Error en notificaciones gerenciales: {e}")

        return req
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{requisicion_id}/rechazar-gerente", response_model=RequisicionOut)
async def rechazar_gerencia(
    requisicion_id: int,
    payload: RechazarPayload,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Rechazar requisición a nivel Gerencial."""
    if usuario.cedula != "66903320" and usuario.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a la Gerente Administrativa y Financiera."
        )
    try:
        req = await svc.rechazar_gerente(
            db, requisicion_id, usuario.nombre, usuario.correo or "", payload.observacion
        )
        try:
            await mail.notificar_rechazada(req, payload.observacion)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[RP Email] Error en notificaciones gerenciales: {e}")

        return req
    except (PermissionError, ValueError) as e:
        status_code = 403 if isinstance(e, PermissionError) else 404
        raise HTTPException(status_code=status_code, detail=str(e))


@router.post("/{requisicion_id}/devolver-gerente", response_model=RequisicionOut)
async def devolver_gerencia(
    requisicion_id: int,
    payload: DevolverPayload,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Devolver requisición para ajustes a nivel Gerencial."""
    if usuario.cedula != "66903320" and usuario.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a la Gerente Administrativa y Financiera."
        )
    try:
        req = await svc.devolver_gerente(
            db, requisicion_id, usuario.nombre, usuario.correo or "", payload.observacion
        )
        try:
            await mail.notificar_devuelta(req, payload.observacion)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[RP Email] Error en notificaciones gerenciales: {e}")

        return req
    except (PermissionError, ValueError) as e:
        status_code = 403 if isinstance(e, PermissionError) else 404
        raise HTTPException(status_code=status_code, detail=str(e))
