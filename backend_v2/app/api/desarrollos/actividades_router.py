"""
API de Actividades (WBS) - Backend V2
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import obtener_db
from app.models.desarrollo.actividad import (
    Actividad,
    ActividadCrear,
    ActividadActualizar,
    ActividadLeer,
    ActividadArbol,
)

router = APIRouter()


@router.post("/", response_model=ActividadLeer)
async def crear_actividad(
    actividad_in: ActividadCrear, db: AsyncSession = Depends(obtener_db)
):
    """Crea una nueva actividad (puede ser raíz o subactividad si recibe parent_id)"""
    try:
        nueva_act_data = actividad_in.model_dump()
        nueva_act = Actividad(**nueva_act_data)
        db.add(nueva_act)
        await db.commit()
        await db.refresh(nueva_act)
        return nueva_act
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al crear actividad: {str(e)}"
        )


@router.get("/desarrollo/{desarrollo_id}/arbol", response_model=List[ActividadArbol])
async def obtener_arbol_actividades(
    desarrollo_id: str, db: AsyncSession = Depends(obtener_db)
):
    """
    Obtiene el árbol completo de actividades para un desarrollo específico.
    Carga todas las actividades relacionadas al desarrollo en memoria y arma la estructura.
    """
    try:
        stmt = select(Actividad).where(Actividad.desarrollo_id == desarrollo_id)
        result = await db.execute(stmt)
        actividades = result.scalars().all()

        # Diccionario para busqueda y construcción de la respuesta
        actividades_dict = {a.id: ActividadArbol.model_validate(a) for a in actividades}

        arbol = []
        for a in actividades:
            a_dto = actividades_dict[a.id]
            if a.parent_id is None:
                arbol.append(a_dto)
            else:
                padre = actividades_dict.get(a.parent_id)
                if padre:
                    padre.subactividades.append(a_dto)

        return arbol
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener árbol: {str(e)}")


@router.patch("/{actividad_id}", response_model=ActividadLeer)
async def actualizar_actividad(
    actividad_id: int,
    actividad_in: ActividadActualizar,
    db: AsyncSession = Depends(obtener_db),
):
    """Actualiza una actividad existente (avance, estado, responsable, etc)"""
    try:
        stmt = select(Actividad).where(Actividad.id == actividad_id)
        result = await db.execute(stmt)
        act_db = result.scalar_one_or_none()

        if not act_db:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        act_data = actividad_in.model_dump(exclude_unset=True)
        for key, value in act_data.items():
            setattr(act_db, key, value)

        await db.commit()
        await db.refresh(act_db)
        return act_db
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar actividad: {str(e)}"
        )


@router.delete("/{actividad_id}", status_code=204)
async def eliminar_actividad(actividad_id: int, db: AsyncSession = Depends(obtener_db)):
    """Elimina una actividad. NOTA: PostgreSQL debe manejar CASCADE si se configuro o rechazar si tiene hijos."""
    try:
        stmt = select(Actividad).where(Actividad.id == actividad_id)
        result = await db.execute(stmt)
        act_db = result.scalar_one_or_none()

        if not act_db:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")

        await db.delete(act_db)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar actividad: {str(e)}"
        )
