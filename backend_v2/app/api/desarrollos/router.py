"""
API de Desarrollos - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db
from sqlalchemy import select
from app.models.desarrollo.desarrollo import Desarrollo, DesarrolloCrear, DesarrolloActualizar

router = APIRouter()


@router.get("/", response_model=List[Desarrollo])
async def listar_desarrollos(
    skip: int = 0, 
    limit: int = 100,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db)
):
    """Lista todos los desarrollos con filtros opcionales"""
    try:
        query = select(Desarrollo).offset(skip).limit(limit)
        
        # Filtro por estado si se envía
        if estado:
            query = query.where(Desarrollo.estado_general == estado)
            
        result = await db.execute(query)
        desarrollos = result.scalars().all()
            
        return desarrollos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar desarrollos: {str(e)}")


@router.post("/", response_model=Desarrollo)
async def crear_desarrollo(
    desarrollo_in: DesarrolloCrear, 
    db: AsyncSession = Depends(obtener_db)
):
    """Crea un nuevo desarrollo"""
    try:
        nueva_data = desarrollo_in.model_dump()
        nuevo_desarrollo = Desarrollo(**nueva_data)
        db.add(nuevo_desarrollo)
        await db.commit()
        await db.refresh(nuevo_desarrollo)
        return nuevo_desarrollo
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear desarrollo: {str(e)}")


@router.get("/informe-detallado-casos-portal")
async def informe_detallado_casos_portal(
    db: AsyncSession = Depends(obtener_db)
):
    """Retorna el informe detallado de casos para el portal"""
    try:
        # Mock data compatible con usePortalReport.ts
        return {
            "total_casos": 2,
            "summary": {
                "status_distribution": {"En Desarrollo": 1, "Pruebas": 1},
                "provider_distribution": {"TI Interno": 2}
            },
            "casos": [
                {
                    "desarrollo_id": 101,
                    "nombre_desarrollo": "Mejora Login",
                    "notas_actividad": "En proceso de pruebas de integración",
                    "tipo_actividad": "Desarrollo",
                    "estado_actividad": "En Pruebas",
                    "nombre_etapa": "Pruebas QA",
                    "fecha_inicio_actividad": "2024-01-20",
                    "fecha_fin_actividad": "2024-01-25",
                    "tipo_actor": "Analista",
                    "proveedor": "TI Interno"
                }
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener informe de casos: {str(e)}")


@router.get("/{desarrollo_id}", response_model=Desarrollo)
async def obtener_desarrollo(
    desarrollo_id: str, 
    db: AsyncSession = Depends(obtener_db)
):
    """Obtiene un desarrollo por su ID"""
    try:
        query = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
        result = await db.execute(query)
        desarrollo = result.scalar_one_or_none()
        
        if not desarrollo:
            raise HTTPException(status_code=404, detail="Desarrollo no encontrado")
            
        return desarrollo
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener desarrollo: {str(e)}")


@router.put("/{desarrollo_id}", response_model=Desarrollo)
async def actualizar_desarrollo(
    desarrollo_id: str,
    desarrollo: DesarrolloActualizar,
    db: AsyncSession = Depends(obtener_db)
):
    """Actualiza un desarrollo existente"""
    try:
        query = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
        result = await db.execute(query)
        db_desarrollo = result.scalar_one_or_none()

        if not db_desarrollo:
            raise HTTPException(status_code=404, detail="Desarrollo no encontrado")

        update_data = desarrollo.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_desarrollo, key, value)

        await db.commit()
        await db.refresh(db_desarrollo)
        return db_desarrollo
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar desarrollo: {str(e)}")
