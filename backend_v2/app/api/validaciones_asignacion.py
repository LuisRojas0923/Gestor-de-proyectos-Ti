from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import (
    Desarrollo,
    ValidacionAsignacion,
    ValidacionAsignacionPublico,
    ValidacionAsignacionResolver,
)
from app.services.jerarquia import AsignacionJerarquicaService

router = APIRouter()


@router.get("/", response_model=List[ValidacionAsignacionPublico])
async def listar_validaciones_asignacion(
    estado: str = "pendiente",
    validador_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(obtener_db),
):
    """Lista validaciones de asignación, opcionalmente por validador."""
    try:
        # Aliases para unir con la tabla de usuarios tres veces
        solicitante = aliased(Usuario)
        validador = aliased(Usuario)
        asignado = aliased(Usuario)

        stmt = (
            select(
                ValidacionAsignacion,
                solicitante.nombre.label("solicitado_por_nombre"),
                validador.nombre.label("validador_nombre"),
                asignado.nombre.label("asignado_a_nombre"),
                Actividad.titulo.label("actividad_titulo"),
                Desarrollo.nombre.label("desarrollo_nombre"),
            )
            .outerjoin(solicitante, ValidacionAsignacion.solicitado_por_id == solicitante.id)
            .outerjoin(validador, ValidacionAsignacion.validador_id == validador.id)
            .outerjoin(asignado, ValidacionAsignacion.asignado_a_id == asignado.id)
            .outerjoin(Actividad, ValidacionAsignacion.actividad_id == Actividad.id)
            .outerjoin(Desarrollo, ValidacionAsignacion.desarrollo_id == Desarrollo.id)
            .where(ValidacionAsignacion.estado == estado)
        )

        if validador_id:
            stmt = stmt.where(ValidacionAsignacion.validador_id == validador_id)
        
        stmt = stmt.order_by(ValidacionAsignacion.creado_en.desc())
        
        result = await db.execute(stmt)
        
        validaciones = []
        for row in result.all():
            v = row[0]
            validaciones.append(
                ValidacionAsignacionPublico(
                    **v.dict(),
                    solicitado_por_nombre=row.solicitado_por_nombre,
                    validador_nombre=row.validador_nombre,
                    asignado_a_nombre=row.asignado_a_nombre,
                    actividad_titulo=row.actividad_titulo,
                    desarrollo_nombre=row.desarrollo_nombre,
                )
            )
        
        return validaciones
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
