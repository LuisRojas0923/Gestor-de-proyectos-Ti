from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from datetime import date
from pydantic import BaseModel
import uuid

from ...database import obtener_db, obtener_erp_db
from ...services.erp import ViaticosService

router = APIRouter(prefix="/viaticos")

# --- Schemas ---

class OTResponse(BaseModel):
    numero: str
    especialidad: Optional[str] = None
    cliente: Optional[str] = None
    ciudad: Optional[str] = None
    centrocosto: Optional[str] = None
    subcentrocosto: Optional[str] = None

class LineaGasto(BaseModel):
    categoria: str
    fecha: Union[date, str]
    ot: str
    ot_id: Optional[str] = None
    cc: str
    scc: str
    valorConFactura: float
    valorSinFactura: float
    observaciones: Optional[str] = None
    adjuntos: Optional[List[dict]] = []

class ReporteViaticos(BaseModel):
    reporte_id: Optional[str] = None
    empleado_cedula: str
    empleado_nombre: str
    area: str
    cargo: str
    centrocosto: Optional[str] = None
    ciudad: str
    observaciones_gral: Optional[str] = None
    gastos: List[LineaGasto]
    usuario_id: str
    estado: Optional[str] = 'INICIAL'

# --- Endpoints ---

@router.get("/ots", response_model=List[OTResponse])
def buscar_ots(query: Optional[str] = None, db_erp: Session = Depends(obtener_erp_db)):
    """Busca OTs en la tabla otviaticos del ERP"""
    try:
        resultado = ViaticosService.buscar_ots(db_erp, query)
        return [OTResponse(**row) for row in resultado]
    except Exception as e:
        print(f"ERROR ERP: {e}")
        raise HTTPException(status_code=500, detail=f"Error al consultar OTs en ERP: {str(e)}")

@router.get("/ot/{numero}/combinaciones", response_model=List[OTResponse])
def obtener_combinaciones_ot(numero: str, db_erp: Session = Depends(obtener_erp_db)):
    """Obtiene todas las combinaciones de CC/SCC para una OT específica"""
    try:
        resultado = ViaticosService.obtener_combinaciones_ot(db_erp, numero)
        return [OTResponse(**row) for row in resultado]
    except Exception as e:
        print(f"ERROR ERP combinaciones: {e}")
        raise HTTPException(status_code=500, detail=f"Error al consultar combinaciones de OT: {str(e)}")

@router.post("/enviar")
async def enviar_reporte(reporte: ReporteViaticos, db_erp: Session = Depends(obtener_erp_db)):
    """Recibe un reporte de viaticos y lo guarda en la tabla de transito del ERP (Solid)"""
    try:
        # Convertir el modelo Pydantic a dict para el servicio
        reporte_id = ViaticosService.enviar_reporte(db_erp, reporte.model_dump())
        
        return {
            "status": "success", 
            "reporte_id": reporte_id, 
            "count": len(reporte.gastos),
            "mensaje": "Reporte enviado correctamente a la tabla de tránsito del ERP"
        }
    except Exception as e:
        print(f"ERROR ENVIAR ERP: {e}")
        raise HTTPException(status_code=500, detail=f"Error al guardar reporte en transito: {str(e)}")

@router.get("/reporte/{reporte_id}/detalle")
async def obtener_detalle_reporte(reporte_id: str, db_erp: Session = Depends(obtener_erp_db)):
    """Obtiene el detalle completo de las líneas de un reporte en tránsito"""
    try:
        return ViaticosService.obtener_detalle_reporte(db_erp, reporte_id)
    except Exception as e:
        print(f"ERROR GET DETALLE REPORTE: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener detalle del reporte: {str(e)}")

@router.get("/estado-cuenta")
def obtener_estado_cuenta(
    cedula: str, 
    desde: Optional[date] = None, 
    hasta: Optional[date] = None, 
    db_erp: Session = Depends(obtener_erp_db)
):
    """Obtiene el estado de cuenta detallado de viáticos desde el ERP"""
    try:
        return ViaticosService.obtener_estado_cuenta(db_erp, cedula, desde, hasta)
    except Exception as e:
        print(f"ERROR ERP Estado Cuenta: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener estado de cuenta: {str(e)}")

@router.get("/reportes/{cedula}")
async def obtener_reportes_viaticos(cedula: str, db_erp: Session = Depends(obtener_erp_db)):
    """Obtiene el listado agrupado de legalizaciones desde la tabla de cabecera"""
    try:
        return ViaticosService.obtener_resumen_legalizaciones(db_erp, cedula)
    except Exception as e:
        print(f"ERROR GET REPORTES ERP: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener listado de legalizaciones: {str(e)}")

@router.delete("/reporte/{reporte_id}")
async def eliminar_reporte(reporte_id: str, db_erp: Session = Depends(obtener_erp_db)):
    """Elimina permanentemente un reporte en tránsito (cabecera y detalle)"""
    try:
        ViaticosService.eliminar_reporte(db_erp, reporte_id)
        return {"status": "success", "mensaje": f"Reporte {reporte_id} eliminado correctamente"}
    except Exception as e:
        print(f"ERROR DELETE REPORTE ERP: {e}")
        raise HTTPException(status_code=500, detail=f"Error al eliminar el reporte: {str(e)}")
