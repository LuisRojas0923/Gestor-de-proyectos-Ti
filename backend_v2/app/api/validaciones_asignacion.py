from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import obtener_db
from app.models.desarrollo.desarrollo import (
    ValidacionAsignacion,
    ValidacionAsignacionResolver,
)
from app.services.jerarquia import AsignacionJerarquicaService

router = APIRouter()


@router.get("/", response_model=List[ValidacionAsignacion])
async def listar_validaciones_asignacion(
    estado: str = "pendiente",
    validador_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(obtener_db),
):
    """Lista validaciones de asignación, opcionalmente por validador."""
    try:
        stmt = select(ValidacionAsignacion).where(ValidacionAsignacion.estado == estado)
        if validador_id:
            stmt = stmt.where(ValidacionAsignacion.validador_id == validador_id)
        stmt = stmt.order_by(ValidacionAsignacion.creado_en.desc())
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar validaciones: {str(e)}")


@router.post("/{validacion_id}/resolver", response_model=ValidacionAsignacion)
async def resolver_validacion_asignacion(
    validacion_id: int,
    payload: ValidacionAsignacionResolver,
    db: AsyncSession = Depends(obtener_db),
):
    """Aprueba o rechaza una validación de asignación pendiente."""
    try:
        validacion = await db.get(ValidacionAsignacion, validacion_id)
        if not validacion:
            raise HTTPException(status_code=404, detail="Validación no encontrada")

        return await AsignacionJerarquicaService.resolver_validacion(
            db,
            validacion,
            payload.estado,
            payload.observacion,
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al resolver validación: {str(e)}")
