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


@router.post("/sincronizar")
async def sincronizar_erp(db: Session = Depends(obtener_db)):
    """
    Sincroniza datos del ERP con la base de datos local
    """
    # Lgica de sincronizacin
    return {"mensaje": "Sincronizacin iniciada"}
