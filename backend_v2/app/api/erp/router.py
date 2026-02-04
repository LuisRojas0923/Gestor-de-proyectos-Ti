"""
API de Endpoint ERP - Backend V2
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import obtener_db, obtener_erp_db
from app.services.erp import EmpleadosService
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
    # Logica de integracion ERP (se completara con el servicio)
    return {"mensaje": "Consultando ERP...", "solicitudes": []}


@router.get("/empleado/{identificacion}")
async def obtener_empleado_erp(
    identificacion: str, 
    db_erp: Session = Depends(obtener_erp_db)
):
    """
    Consulta un empleado en el ERP para el login del portal
    """
    empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, identificacion)
    
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
    # Logica de sincronizacion
    return {"mensaje": "Sincronizacion iniciada"}
