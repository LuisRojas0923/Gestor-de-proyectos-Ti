"""
API de Endpoint ERP - Backend V2
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
import httpx
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from app.database import obtener_db, obtener_erp_db_opcional
from app.models.auth.usuario import Usuario
from app.services.erp import EmpleadosService
from typing import Optional
from app.config import config
from app.api.erp.requisiciones_router import router as requisiciones_router
from app.api.novedades_nomina.routers.horas_extras_permisos import requiere_permiso_he_planificar
from app.api.auth.router import obtener_usuario_actual_db
from app.core.rate_limiter import limiter


logger = logging.getLogger(__name__)

router = APIRouter()

router.include_router(requisiciones_router, prefix="/requisiciones")


@router.get("/solicitudes")
async def consultar_solicitudes_erp(
    empresa: Optional[str] = None,
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(obtener_usuario_actual_db),
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
    _: Usuario = Depends(requiere_permiso_he_planificar),
):
    """
    Consulta un empleado en el ERP para planeación de horas extras.
    Si el ERP no esta disponible o la consulta falla, devuelve 503.
    """
    if db_erp is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio ERP no esta disponible. Usa login de administrador (usuario y contraseña).",
        )
    try:
        empleado = await run_in_threadpool(
            EmpleadosService.obtener_empleado_por_cedula_sync,
            db_erp,
            identificacion,
        )
    except Exception as exc:
        logger.exception("Error consultando empleado ERP")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Error al consultar el ERP. Verifica la conexion o usa login de administrador.",
        ) from exc
    if not empleado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado o inactivo en el ERP",
        )
    return empleado


@router.post("/sincronizar")
async def sincronizar_erp(
    db: Session = Depends(obtener_db),
    _: Usuario = Depends(obtener_usuario_actual_db),
):
    """
    Sincroniza datos del ERP con la base de datos local
    """
    # Logica de sincronizacion
    return {"mensaje": "Sincronizacion iniciada"}


@router.post("/sync-external")
@limiter.limit("10/minute")
async def sincronizar_externo(
    request: Request,
    _: Usuario = Depends(obtener_usuario_actual_db),
):
    """
    Proxy para el servicio externo de sincronización OT/OS.
    Resuelve problemas de CORS al llamar desde el frontend.
    """
    url_externa = config.sync_external_url
    try:
        async with httpx.AsyncClient(timeout=75.0) as client:
            logger.info("Ejecutando sincronización externa ERP")
            response = await client.post(url_externa)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        logger.warning("Servicio externo ERP respondió con estado %s", exc.response.status_code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error en el servicio externo de sincronización ERP",
        ) from exc
    except httpx.RequestError as exc:
        logger.warning("No se pudo contactar el servicio externo ERP")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo contactar el servicio externo de sincronización ERP",
        ) from exc
    except Exception as exc:
        logger.exception("Error inesperado en sincronización externa ERP")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado en sincronización ERP",
        ) from exc
