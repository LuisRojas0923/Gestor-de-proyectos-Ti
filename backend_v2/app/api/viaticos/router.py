from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
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
    fecha: date
    ot: str
    cc: str
    scc: str
    valorConFactura: float
    valorSinFactura: float
    observaciones: Optional[str] = None
    adjuntos: Optional[List[dict]] = []

class ReporteViaticos(BaseModel):
    empleado_cedula: str
    empleado_nombre: str
    area: str
    cargo: str
    ciudad: str
    observaciones_gral: Optional[str] = None
    gastos: List[LineaGasto]
    usuario_id: str

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
    """Obtiene los reportes en tránsito agrupados por reporte_id desde el ERP"""
    try:
        lineas = ViaticosService.obtener_reportes_transito(db_erp, cedula)
        
        reportes = {}
        for l in lineas:
            rid = str(l["reporte_id"])
            if rid not in reportes:
                reportes[rid] = {
                    "reporte_id": rid,
                    "fecha": l["fecha_registro"],
                    "estado": l["estado"],
                    "empleado_nombre": l["empleado_nombre"],
                    "area": l["area"],
                    "cargo": l["cargo"],
                    "ciudad": l["ciudad"],
                    "total_con_factura": 0.0,
                    "total_sin_factura": 0.0,
                    "cantidad_lineas": 0,
                    "observaciones_gral": l["observaciones_gral"]
                }
            reportes[rid]["total_con_factura"] += float(l["valor_con_factura"] or 0)
            reportes[rid]["total_sin_factura"] += float(l["valor_sin_factura"] or 0)
            reportes[rid]["cantidad_lineas"] += 1
            
        lista_reportes = list(reportes.values())
        lista_reportes.sort(key=lambda x: x["fecha"] if x["fecha"] else "", reverse=True)
        
        return lista_reportes
    except Exception as e:
        print(f"ERROR GET REPORTES ERP: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener reportes en tránsito desde el ERP: {str(e)}")
