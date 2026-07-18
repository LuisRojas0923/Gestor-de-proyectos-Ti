"""Endpoints de workflow y compensación de Horas Extras."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_horas_extras import (
    AutorizarCalculoResult,
    CompensarBolsaRequest,
    CompensarBolsaResponse,
    WorkflowTransicionRequest,
    WorkflowTransicionResult,
)
from ....services.auditoria.snapshots import asignar_evento_segura
from ....services.auth.alcance_empleados_service import (
    autorizar_calculo_id,
    autorizar_cedula,
)
from ....services.novedades_nomina.horas_extras_autorizacion import (
    autorizar_calculo_pendiente,
)
from ....services.novedades_nomina.horas_extras_workflow import (
    compensar_bolsa,
    transicionar_calculo,
)
from .horas_extras_permisos import (
    PERMISO_HE_COMPENSAR,
    requiere_permiso_he_autorizar,
    requiere_permiso_he_compensar,
    requiere_permiso_he_confirmar,
    validar_permiso_he,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Nómina - Horas Extras"])


@router.post(
    "/calculos/{calculo_id}/autorizar",
    response_model=AutorizarCalculoResult,
)
async def autorizar_calculo_endpoint(
    request: Request,
    calculo_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_autorizar),
):
    asignar_evento_segura(
        request,
        modulo="nomina_horas_extras.autorizar",
        entidad_tipo="calculo_horas_extras",
        entidad_id=str(calculo_id),
    )
    try:
        await autorizar_calculo_id(db, usuario, calculo_id)
        usuario_id = str(getattr(usuario, "cedula", None) or usuario.id)
        resultado = await autorizar_calculo_pendiente(db, calculo_id, usuario_id)
        await db.commit()
    except LookupError as exc:
        raise HTTPException(404, "Recurso no encontrado") from exc
    except ValueError as exc:
        await db.rollback()
        if "no encontrado" in str(exc):
            raise HTTPException(404, "Recurso no encontrado") from exc
        raise HTTPException(409, str(exc)) from exc
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.exception("Error de persistencia al autorizar el cálculo %s", calculo_id)
        raise HTTPException(503, "No fue posible autorizar el cálculo") from exc

    return AutorizarCalculoResult(
        **resultado,
        mensaje=(
            "El cálculo ya estaba autorizado"
            if resultado["ya_autorizado"]
            else "Cálculo autorizado correctamente"
        ),
    )


@router.post("/calculos/{calculo_id}/transicion", response_model=WorkflowTransicionResult)
async def transicionar_calculo_endpoint(
    calculo_id: int = Path(..., ge=1),
    payload: WorkflowTransicionRequest = ...,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_confirmar),
):
    """Aplica una transición de estado al cálculo."""
    if payload.estado_destino == "COMPENSADO":
        await validar_permiso_he(db, usuario, PERMISO_HE_COMPENSAR)
    try:
        await autorizar_calculo_id(db, usuario, calculo_id)
    except LookupError as exc:
        raise HTTPException(404, "Recurso no encontrado") from exc

    usuario_id = getattr(usuario, "cedula", None) or usuario.id
    try:
        resultado = await transicionar_calculo(
            db,
            calculo_id=calculo_id,
            estado_destino=payload.estado_destino,
            justificacion=payload.justificacion,
            usuario_id=usuario_id,
            horas_compensar=payload.horas,
            fecha_compensacion=payload.fecha,
        )
        await db.commit()
    except ValueError as exc:
        mensaje = str(exc)
        if "no encontrado" in mensaje:
            raise HTTPException(status_code=404, detail=mensaje) from exc
        if mensaje.startswith("BOLSA_DESACTIVADA"):
            raise HTTPException(
                status_code=409,
                detail={"code": "BOLSA_DESACTIVADA", "message": mensaje},
            ) from exc
        raise HTTPException(status_code=409, detail=mensaje) from exc

    return WorkflowTransicionResult(
        calculo_id=resultado["calculo_id"],
        estado_anterior=resultado["estado_anterior"],
        estado_nuevo=resultado["estado_nuevo"],
        evento_id=resultado["evento_id"],
        movimiento_bolsa_id=resultado["movimiento_bolsa_id"],
        horas_afectadas=resultado["horas_afectadas"],
        mensaje=(
            f"Cálculo {calculo_id} pasó de {resultado['estado_anterior']} "
            f"a {resultado['estado_nuevo']}."
        ),
    )


@router.post("/bolsa/compensar", response_model=CompensarBolsaResponse)
async def compensar_bolsa_endpoint(
    payload: CompensarBolsaRequest,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_compensar),
):
    """Consume horas de la bolsa del empleado."""
    usuario_id = getattr(usuario, "cedula", None) or usuario.id
    try:
        payload.cedula = await autorizar_cedula(db, usuario, payload.cedula)
        if payload.calculo_id is not None:
            cedula_calculo = await autorizar_calculo_id(
                db, usuario, payload.calculo_id
            )
            if cedula_calculo != payload.cedula:
                raise LookupError("Recurso no encontrado")
    except (LookupError, PermissionError, ValueError) as exc:
        raise HTTPException(404, "Empleado no encontrado") from exc

    try:
        resultado = await compensar_bolsa(
            db,
            cedula=payload.cedula,
            horas=payload.horas,
            fecha=payload.fecha,
            usuario_id=usuario_id,
            calculo_id=payload.calculo_id,
            observaciones=payload.observaciones,
        )
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return CompensarBolsaResponse(
        cedula=payload.cedula,
        movimiento_id=resultado["movimiento_id"],
        horas_compensadas=resultado["horas_compensadas"],
        horas_disponibles_despues=resultado["horas_disponibles_despues"],
        mensaje=(
            f"Se compensaron {resultado['horas_compensadas']}h "
            f"de la bolsa de {payload.cedula}."
        ),
    )
