import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from app.database import obtener_erp_db_opcional
from app.api.auth.router import obtener_usuario_actual_db
from app.models.auth.usuario import Usuario
from app.models.erp.requisiciones import (
    OTSistemaSolicitudes,
    CatalogoProducto,
    SolicitudMaterialCrear,
)
from app.services.erp.requisiciones_service import RequisicionesService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/ots", response_model=List[OTSistemaSolicitudes])
def obtener_ots(
    busqueda: Optional[str] = None,
    limit: int = 50,
    db_erp: Optional[Session] = Depends(obtener_erp_db_opcional),
    _: Usuario = Depends(obtener_usuario_actual_db),
):
    """Obtiene el listado de OTS para el formulario de requisiciones"""
    if db_erp is None:
        raise HTTPException(status_code=503, detail="Servicio ERP no disponible")

    try:
        resultados = RequisicionesService.obtener_ots_solicitudes(
            db_erp, busqueda, limit
        )
        return resultados
    except Exception as exc:
        logger.exception("Error consultando OTS en ERP")
        raise HTTPException(status_code=500, detail="Error consultando OTS en el ERP") from exc


@router.get("/catalogo", response_model=List[CatalogoProducto])
def obtener_catalogo(
    busqueda: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db_erp: Optional[Session] = Depends(obtener_erp_db_opcional),
    _: Usuario = Depends(obtener_usuario_actual_db),
):
    """Busca productos en el catálogo del ERP"""
    if db_erp is None:
        raise HTTPException(status_code=503, detail="Servicio ERP no disponible")

    try:
        resultados = RequisicionesService.obtener_catalogo_producto(
            db_erp, busqueda, limit, offset
        )
        return resultados
    except Exception as exc:
        logger.exception("Error consultando catálogo ERP")
        raise HTTPException(
            status_code=500, detail="Error consultando el catálogo en el ERP"
        ) from exc


@router.post("/crear")
def crear_solicitud(
    solicitud: SolicitudMaterialCrear,
    db_erp: Optional[Session] = Depends(obtener_erp_db_opcional),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Crea una nueva solicitud (encabezado y detalles) en el ERP"""
    if db_erp is None:
        raise HTTPException(
            status_code=503,
            detail="Servicio ERP no disponible para guardar la solicitud",
        )

    try:
        # Extraer ID numerico si es posible, o pasar None
        usuario_id = None
        try:
            if usuario_actual.id and usuario_actual.id.isdigit():
                usuario_id = int(usuario_actual.id)
        except (TypeError, ValueError):
            pass

        nueva_solicitud = RequisicionesService.crear_solicitud_material(
            db_erp=db_erp,
            solicitud_data=solicitud,
            usuario_id=usuario_id,
            nombre_usuario=usuario_actual.nombre,
        )

        return {
            "mensaje": "Solicitud creada exitosamente",
            "codigosolicitud": nueva_solicitud.codigosolicitud,
            "codigo": nueva_solicitud.codigo,
        }
    except Exception as exc:
        db_erp.rollback()
        logger.exception("Error creando solicitud en ERP")
        raise HTTPException(
            status_code=500, detail="Error creando solicitud en el ERP"
        ) from exc


@router.get("/mis-solicitudes", response_model=List[Any])
def obtener_mis_solicitudes(
    limit: int = 50,
    db_erp: Optional[Session] = Depends(obtener_erp_db_opcional),
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
):
    """Consulta el historial de solicitudes enviadas al ERP por el usuario actual"""
    if db_erp is None:
        raise HTTPException(status_code=503, detail="Servicio ERP no disponible")

    try:
        usuario_id = None
        try:
            if usuario_actual.id and usuario_actual.id.isdigit():
                usuario_id = int(usuario_actual.id)
        except (TypeError, ValueError):
            pass

        resultados = RequisicionesService.obtener_mis_solicitudes(
            db_erp=db_erp,
            usuario_id=usuario_id,
            nombre_usuario=usuario_actual.nombre,
            limit=limit,
        )
        return resultados
    except Exception as exc:
        logger.exception("Error consultando historial de solicitudes en ERP")
        raise HTTPException(
            status_code=500,
            detail="Error consultando el historial de solicitudes en ERP",
        ) from exc
