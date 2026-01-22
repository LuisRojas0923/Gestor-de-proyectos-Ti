"""
API de Etapas - Backend V2
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import obtener_db

router = APIRouter()

@router.get("/flujo-ciclo")
async def obtener_flujo_ciclo(db: Session = Depends(obtener_db)):
    """Retorna el flujo del ciclo de vida de un desarrollo"""
    # Mock data para ApiDebug.tsx
    return [
        {"id": 1, "nombre": "Análisis", "orden": 1},
        {"id": 2, "nombre": "Desarrollo", "orden": 2},
        {"id": 3, "nombre": "Pruebas", "orden": 3},
        {"id": 4, "nombre": "Cierre", "orden": 4}
    ]

@router.get("/cycle-flow")
async def obtener_cycle_flow_legacy(db: Session = Depends(obtener_db)):
    """Endpoint legado para compatibilidad con ApiDebug.tsx"""
    return await obtener_flujo_ciclo(db)
