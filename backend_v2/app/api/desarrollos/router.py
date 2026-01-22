"""
API de Desarrollos - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import obtener_db
from app.schemas.desarrollo import Desarrollo, DesarrolloCrear, DesarrolloActualizar

router = APIRouter()


@router.get("/", response_model=List[Desarrollo])
async def listar_desarrollos(
    skip: int = 0, 
    limit: int = 100,
    estado: Optional[str] = None,
    db: Session = Depends(obtener_db)
):
    """Lista todos los desarrollos con filtros opcionales"""
    # Lgica (se completar con el servicio)
    return []


@router.post("/", response_model=Desarrollo)
async def crear_desarrollo(
    desarrollo: DesarrolloCrear, 
    db: Session = Depends(obtener_db)
):
    """Crea un nuevo desarrollo"""
    # Lgica
    return desarrollo # Temporal


@router.get("/{desarrollo_id}", response_model=Desarrollo)
async def obtener_desarrollo(
    desarrollo_id: str, 
    db: Session = Depends(obtener_db)
):
    """Obtiene un desarrollo por su ID"""
    # Lgica
    raise HTTPException(status_code=404, detail="Desarrollo no encontrado")


@router.put("/{desarrollo_id}", response_model=Desarrollo)
async def actualizar_desarrollo(
    desarrollo_id: str,
    desarrollo: DesarrolloActualizar,
    db: Session = Depends(obtener_db)
):
    """Actualiza un desarrollo existente"""
    # Lgica
    return {}


@router.get("/informe-detallado-casos-portal")
async def informe_detallado_casos_portal(
    db: Session = Depends(obtener_db)
):
    """Retorna el informe detallado de casos para el portal"""
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
