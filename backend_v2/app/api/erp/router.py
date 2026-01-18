"""
API de Endpoint ERP - Backend V2
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import obtener_db
from typing import Any, Dict, List, Optional

router = APIRouter()


@router.get("/solicitudes")
async def consultar_solicitudes_erp(
    empresa: Optional[str] = None,
    db: Session = Depends(obtener_db)
):
    """
    Consulta solicitudes de desarrollo desde el sistema ERP
    """
    # Lgica de integracin ERP (se completar con el servicio)
    return {"mensaje": "Consultando ERP...", "solicitudes": []}


# Ambiente
ENVIRONMENT=development

# ERP Externo
ERP_DATABASE_URL=postgresql://user:password@localhost:5432/erp_db
@router.get("/empleado/{identificacion}")
async def obtener_empleado_erp(
    identificacion: str, 
    db_erp: Session = Depends(obtener_erp_db)
):
    """
    Consulta un empleado en el ERP para el login del portal
    """
    empleado = await ServicioErp.obtener_empleado_por_cedula(db_erp, identificacion)
    
    if not empleado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado o inactivo en el ERP"
        )
    
    return empleado


@router.post("/sincronizar")
async def sincronizar_erp(db: Session = Depends(obtener_db)):
    """
    Sincroniza datos del ERP con la base de datos local
    """
    # Lgica de sincronizacin
    return {"mensaje": "Sincronizacin iniciada"}
