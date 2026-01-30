from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
import uuid

from ...database import obtener_db, obtener_erp_db
from ...models.viaticos.transito import TransitoViatico

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
    """Busca OTs en la tabla otviaticos del ERP (Sincrono)"""
    sql = "SELECT numero, MAX(especialidad) as especialidad, MAX(cliente) as cliente, MAX(ciudad) as ciudad FROM otviaticos"
    params = {}
    
    if query:
        sql += " WHERE numero LIKE :query OR cliente LIKE :query"
        params = {"query": f"%{query}%"}
    
    # Agrupar por número para evitar duplicados en la lista de búsqueda
    sql += " GROUP BY numero"
    
    # Limitar resultados para performance
    sql += " LIMIT 50"
    
    try:
        resultado = db_erp.execute(text(sql), params).all()
        return [
            OTResponse(
                numero=str(row.numero),
                especialidad=row.especialidad,
                cliente=row.cliente,
                ciudad=row.ciudad
            ) for row in resultado
        ]
    except Exception as e:
        print(f"ERROR ERP: {e}")
        raise HTTPException(status_code=500, detail=f"Error al consultar OTs en ERP: {str(e)}")

@router.get("/ot/{numero}/combinaciones", response_model=List[OTResponse])
def obtener_combinaciones_ot(numero: str, db_erp: Session = Depends(obtener_erp_db)):
    """Obtiene todas las combinaciones de CC/SCC para una OT específica"""
    sql = "SELECT DISTINCT numero, MAX(especialidad) OVER (PARTITION BY numero) as especialidad, MAX(cliente) OVER (PARTITION BY numero) as cliente, MAX(ciudad) OVER (PARTITION BY numero) as ciudad, centrocosto, subcentrocosto FROM otviaticos WHERE numero = :numero"
    try:
        resultado = db_erp.execute(text(sql), {"numero": numero}).all()
        return [
            OTResponse(
                numero=str(row.numero),
                especialidad=row.especialidad,
                cliente=row.cliente,
                ciudad=row.ciudad,
                centrocosto=row.centrocosto,
                subcentrocosto=row.subcentrocosto
            ) for row in resultado
        ]
    except Exception as e:
        print(f"ERROR ERP combinaciones: {e}")
        raise HTTPException(status_code=500, detail=f"Error al consultar combinaciones de OT: {str(e)}")

@router.post("/enviar")
async def enviar_reporte(reporte: ReporteViaticos, db_erp: Session = Depends(obtener_erp_db)):
    """Recibe un reporte de viaticos y lo guarda en la tabla de transito del ERP (Solid)"""
    reporte_id = uuid.uuid4()
    
    try:
        print(f"DEBUG: Enviando reporte al ERP - Empleado: {reporte.empleado_nombre}")
        
        sql_insert = text("""
            INSERT INTO transito_viaticos (
                reporte_id, estado, fecha_registro, empleado_cedula, empleado_nombre, 
                area, cargo, ciudad, categoria, fecha_gasto, ot, cc, scc, 
                valor_con_factura, valor_sin_factura, observaciones_linea, 
                observaciones_gral, usuario_id
            ) VALUES (
                :reporte_id, :estado, CURRENT_TIMESTAMP, :empleado_cedula, :empleado_nombre, 
                :area, :cargo, :ciudad, :categoria, :fecha_gasto, :ot, :cc, :scc, 
                :valor_con_factura, :valor_sin_factura, :observaciones_linea, 
                :observaciones_gral, :usuario_id
            )
        """)

        for gasto in reporte.gastos:
            db_erp.execute(sql_insert, {
                "reporte_id": reporte_id,
                "estado": "PRE-INICIAL",
                "empleado_cedula": reporte.empleado_cedula,
                "empleado_nombre": reporte.empleado_nombre,
                "area": reporte.area,
                "cargo": reporte.cargo,
                "ciudad": reporte.ciudad,
                "categoria": gasto.categoria,
                "fecha_gasto": gasto.fecha,
                "ot": gasto.ot,
                "cc": gasto.cc,
                "scc": gasto.scc,
                "valor_con_factura": gasto.valorConFactura,
                "valor_sin_factura": gasto.valorSinFactura,
                "observaciones_linea": gasto.observaciones,
                "observaciones_gral": reporte.observaciones_gral,
                "usuario_id": reporte.usuario_id
            })
        
        db_erp.commit()
        print(f"DEBUG: Reporte {reporte_id} guardado exitosamente en ERP.")

        return {
            "status": "success", 
            "reporte_id": str(reporte_id), 
            "count": len(reporte.gastos),
            "mensaje": "Reporte enviado correctamente a la tabla de tránsito del ERP"
        }
    except Exception as e:
        db_erp.rollback()
        print(f"ERROR ENVIAR ERP: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al enviar reporte al ERP: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al guardar reporte en transito: {str(e)}")

@router.get("/estado-cuenta")
def obtener_estado_cuenta(
    cedula: str, 
    desde: Optional[date] = None, 
    hasta: Optional[date] = None, 
    db_erp: Session = Depends(obtener_erp_db)
):
    """Obtiene el estado de cuenta detallado de viáticos desde el ERP"""
    sql = """
    WITH movimientos AS (
        SELECT 
            codigo, fechaaplicacion, empleado, nombreempleado, 
            codigoconsignacion AS radicado, valor::numeric AS valor, 
            'CONSIGNACION' AS tipo, UPPER(TRIM(estado)) AS estado_limpio, 
            observaciones 
        FROM consignacion
        UNION ALL
        SELECT 
            codigo, fechaaplicacion, empleado, nombreempleado, 
            codigolegalizacion AS radicado, valortotal::numeric AS valor, 
            'LEGALIZACION' AS tipo, UPPER(TRIM(estado)) AS estado_limpio, 
            observaciones 
        FROM legalizacion
    )
    SELECT 
        m.codigo,
        m.fechaaplicacion,
        m.empleado,
        m.nombreempleado,
        m.radicado,
        CASE WHEN m.tipo = 'CONSIGNACION' AND m.estado_limpio = 'CONTABILIZADO' THEN m.valor ELSE 0 END AS consignacion_contabilizado,
        CASE WHEN m.tipo = 'LEGALIZACION' AND m.estado_limpio = 'CONTABILIZADO' THEN m.valor ELSE 0 END AS legalizacion_contabilizado,
        CASE WHEN m.tipo = 'CONSIGNACION' AND m.estado_limpio = 'EN FIRME' THEN m.valor ELSE 0 END AS consignacion_firmadas,
        CASE WHEN m.tipo = 'LEGALIZACION' AND m.estado_limpio = 'EN FIRME' THEN m.valor ELSE 0 END AS legalizacion_firmadas,
        CASE WHEN m.tipo = 'CONSIGNACION' AND m.estado_limpio = 'PENDIENTE' THEN m.valor ELSE 0 END AS consignacion_pendientes,
        CASE WHEN m.tipo = 'LEGALIZACION' AND m.estado_limpio = 'PENDIENTE' THEN m.valor ELSE 0 END AS legalizacion_pendientes,
        SUM(CASE WHEN m.tipo = 'CONSIGNACION' THEN m.valor WHEN m.tipo = 'LEGALIZACION' THEN -m.valor ELSE 0 END) 
            OVER (PARTITION BY m.empleado ORDER BY m.fechaaplicacion ASC, m.codigo ASC) AS saldo,
        m.observaciones
    FROM movimientos m
    WHERE m.empleado = :cedula
    """
    
    params = {"cedula": cedula}
    if desde:
        sql += " AND m.fechaaplicacion >= :desde"
        params["desde"] = desde
    if hasta:
        sql += " AND m.fechaaplicacion <= :hasta"
        params["hasta"] = hasta
        
    sql += " ORDER BY m.fechaaplicacion ASC, m.codigo ASC"

    try:
        resultado = db_erp.execute(text(sql), params).all()
        return [dict(row._mapping) for row in resultado]
    except Exception as e:
        print(f"ERROR ERP Estado Cuenta: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener estado de cuenta: {str(e)}")

@router.get("/reportes/{cedula}")
async def obtener_reportes_viaticos(cedula: str, db_erp: Session = Depends(obtener_erp_db)):
    """Obtiene los reportes en tránsito agrupados por reporte_id desde el ERP"""
    try:
        sql = text("SELECT * FROM transito_viaticos WHERE empleado_cedula = :cedula")
        resultado = db_erp.execute(sql, {"cedula": cedula})
        lineas = [dict(row._mapping) for row in resultado]
        
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener reportes en tránsito desde el ERP: {str(e)}")
