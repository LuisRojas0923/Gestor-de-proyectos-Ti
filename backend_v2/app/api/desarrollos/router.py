"""
API de Desarrollos - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db
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
        # TODO: Implementar lógica con el servicio de desarrollos
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar desarrollos: {str(e)}")


@router.post("/", response_model=Desarrollo)
async def crear_desarrollo(
    desarrollo: DesarrolloCrear, 
    db: AsyncSession = Depends(obtener_db)
):
    """Crea un nuevo desarrollo"""
    try:
        # TODO: Implementar lógica con el servicio de desarrollos
        raise HTTPException(status_code=501, detail="Endpoint no implementado")
    except HTTPException:
        raise
    except Exception as e:
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
        # TODO: Implementar lógica con el servicio de desarrollos
        raise HTTPException(status_code=404, detail="Desarrollo no encontrado")
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
        # TODO: Implementar lógica con el servicio de desarrollos
        raise HTTPException(status_code=501, detail="Endpoint no implementado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar desarrollo: {str(e)}")
