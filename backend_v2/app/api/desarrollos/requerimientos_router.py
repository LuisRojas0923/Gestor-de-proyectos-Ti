"""
API de Requerimientos de Desarrollo - Backend V2
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import obtener_db
from app.models.desarrollo.requerimiento import (
    RequerimientoDesarrollo,
    RequerimientoDesarrolloCrear,
    RequerimientoDesarrolloActualizar,
)

router = APIRouter()


@router.get("/desarrollo/{desarrollo_id}", response_model=List[RequerimientoDesarrollo])
async def listar_requerimientos_desarrollo(
    desarrollo_id: str, db: AsyncSession = Depends(obtener_db)
):
    """Lista todos los requerimientos vinculados a un desarrollo específico"""
    try:
        stmt = select(RequerimientoDesarrollo).where(
            RequerimientoDesarrollo.desarrollo_id == desarrollo_id
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al listar requerimientos: {str(e)}"
        )


@router.post("/", response_model=RequerimientoDesarrollo)
async def crear_requerimiento(
    requerimiento_in: RequerimientoDesarrolloCrear, db: AsyncSession = Depends(obtener_db)
):
    """Crea un nuevo requerimiento para un desarrollo"""
    try:
        nueva_data = requerimiento_in.model_dump()
        nuevo_requerimiento = RequerimientoDesarrollo(**nueva_data)
        db.add(nuevo_requerimiento)
        await db.commit()
        await db.refresh(nuevo_requerimiento)
        return nuevo_requerimiento
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al crear requerimiento: {str(e)}"
        )


@router.patch("/{requerimiento_id}", response_model=RequerimientoDesarrollo)
async def actualizar_requerimiento(
    requerimiento_id: int,
    requerimiento_in: RequerimientoDesarrolloActualizar,
    db: AsyncSession = Depends(obtener_db),
):
    """Actualiza un requerimiento existente"""
    try:
        stmt = select(RequerimientoDesarrollo).where(
            RequerimientoDesarrollo.id == requerimiento_id
        )
        result = await db.execute(stmt)
        req_db = result.scalar_one_or_none()

        if not req_db:
            raise HTTPException(status_code=404, detail="Requerimiento no encontrado")

        update_data = requerimiento_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(req_db, key, value)

        await db.commit()
        await db.refresh(req_db)
        return req_db
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar requerimiento: {str(e)}"
        )


@router.delete("/{requerimiento_id}", status_code=204)
async def eliminar_requerimiento(
    requerimiento_id: int, db: AsyncSession = Depends(obtener_db)
):
    """Elimina un requerimiento"""
    try:
        stmt = select(RequerimientoDesarrollo).where(
            RequerimientoDesarrollo.id == requerimiento_id
        )
        result = await db.execute(stmt)
        req_db = result.scalar_one_or_none()

        if not req_db:
            raise HTTPException(status_code=404, detail="Requerimiento no encontrado")

        await db.delete(req_db)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar requerimiento: {str(e)}"
        )
