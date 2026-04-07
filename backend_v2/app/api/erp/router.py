"""
API de Endpoint ERP - Backend V2
"""

from fastapi import APIRouter, Depends, HTTPException, status
import httpx
from sqlalchemy.orm import Session
from app.database import obtener_db, obtener_erp_db, obtener_erp_db_opcional
from app.services.erp import EmpleadosService
from typing import Any, Dict, List, Optional
from app.config import config
from app.api.erp.requisiciones_router import router as requisiciones_router

router = APIRouter()

router.include_router(requisiciones_router, prefix="/requisiciones")


@router.get("/solicitudes")
async def consultar_solicitudes_erp(
    empresa: Optional[str] = None, db: Session = Depends(obtener_db)
):
    """
    Consulta solicitudes de desarrollo desde el sistema ERP
    """
    # Logica de integracion ERP (se completara con el servicio)
    return {"mensaje": "Consultando ERP...", "solicitudes": []}


@router.get("/empleado/{identificacion}")
async def obtener_empleado_erp(
    identificacion: str,
    db_erp: Optional[Session] = Depends(obtener_erp_db_opcional),
):
    """
    Consulta un empleado en el ERP para el login del portal.
    Si el ERP no esta disponible o la consulta falla, devuelve 503.
    """
    if db_erp is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio ERP no esta disponible. Usa login de administrador (usuario y contraseña).",
        )
    try:
        empleado = await EmpleadosService.obtener_empleado_por_cedula(
            db_erp, identificacion
        )
    except Exception as e:
        print(f"ERROR ERP empleado (cedula={identificacion}): {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Error al consultar el ERP. Verifica la conexion o usa login de administrador.",
        )
    if not empleado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado o inactivo en el ERP",
        )
    return empleado


@router.post("/sincronizar")
async def sincronizar_erp(db: Session = Depends(obtener_db)):
    """
    Sincroniza datos del ERP con la base de datos local
    """
    # Logica de sincronizacion
    return {"mensaje": "Sincronizacion iniciada"}


@router.post("/sync-external")
async def sincronizar_externo():
    """
    Proxy para el servicio externo de sincronización OT/OS.
    Resuelve problemas de CORS al llamar desde el frontend.
    """
    url_externa = config.sync_external_url
    try:
        async with httpx.AsyncClient(timeout=70.0) as client:
            response = await client.post(url_externa)
            return response.json()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error conectando con el servicio de sincronización: {str(exc)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado en sincronización: {str(e)}"
        )
