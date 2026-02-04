from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
import uuid

class ViaticosService:
    """Lógica de negocio para viáticos y consultas relacionadas al ERP (Solid)"""
    
    @staticmethod
    def buscar_ots(db_erp: Session, query: Optional[str] = None) -> List[Dict]:
        """Busca OTs en la tabla otviaticos del ERP"""
        sql = "SELECT numero, MAX(especialidad) as especialidad, MAX(cliente) as cliente, MAX(ciudad) as ciudad FROM otviaticos"
        params = {}
        
        if query:
            sql += " WHERE numero LIKE :query OR cliente LIKE :query"
            params = {"query": f"%{query}%"}
        
        sql += " GROUP BY numero LIMIT 50"
        
        resultado = db_erp.execute(text(sql), params).all()
        return [dict(row._mapping) for row in resultado]

    @staticmethod
    def obtener_combinaciones_ot(db_erp: Session, numero: str) -> List[Dict]:
        """Obtiene todas las combinaciones de CC/SCC para una OT específica"""
        sql = """
            SELECT DISTINCT numero, 
            MAX(especialidad) OVER (PARTITION BY numero) as especialidad, 
            MAX(cliente) OVER (PARTITION BY numero) as cliente, 
            MAX(ciudad) OVER (PARTITION BY numero) as ciudad, 
            centrocosto, subcentrocosto 
            FROM otviaticos 
            WHERE numero = :numero
        """
        resultado = db_erp.execute(text(sql), {"numero": numero}).all()
        return [dict(row._mapping) for row in resultado]

    @staticmethod
    def enviar_reporte(db_erp: Session, reporte_data: Dict) -> str:
        """Guarda o actualiza un reporte de viáticos en la tabla de tránsito del ERP"""
        
        # Identificar si es una actualización o uno nuevo
        # Buscamos en reporte_data si viene un ID previo (UUID)
        reporte_id_str = reporte_data.get("reporte_id")
        es_actualizacion = False
        
        if reporte_id_str:
            try:
                reporte_id = uuid.UUID(reporte_id_str)
                es_actualizacion = True
            except:
                reporte_id = uuid.uuid4()
        else:
            reporte_id = uuid.uuid4()
            
        # Generar o Recuperar Consecutivo Amigable (Formato REP-LXXXX)
        # Lo guardaremos al inicio de observaciones_gral para que sea visible y persistente
        try:
            sql_count = text("SELECT COUNT(DISTINCT reporte_id) FROM transito_viaticos")
            count = db_erp.execute(sql_count).scalar() or 0
            # Si es actualización, intentamos mantener el número previo si existe en observaciones
            if es_actualizacion:
                sql_get_obs = text("SELECT MAX(observaciones_gral) FROM transito_viaticos WHERE reporte_id = :rid")
                obs_previa = db_erp.execute(sql_get_obs, {"rid": reporte_id}).scalar() or ""
                if "[REP-L" in obs_previa:
                    consecutivo = obs_previa.split("]")[0].replace("[", "")
                else:
                    consecutivo = f"REP-L{(count + 1):04d}"
            else:
                consecutivo = f"REP-L{(count + 1):04d}"
        except:
            consecutivo = "REP-LAUTO"

        # Si es actualización, LIMPIAMOS las líneas previas antes de re-insertar (Upsert Lógico)
        if es_actualizacion:
            print(f"DEBUG: Actualizando reporte {reporte_id} ({consecutivo})")
            db_erp.execute(text("DELETE FROM transito_viaticos WHERE reporte_id = :rid"), {"rid": reporte_id})

        # Inyectar el consecutivo en las observaciones generales si no está
        obs_gral = reporte_data.get("observaciones_gral", "")
        if f"[{consecutivo}]" not in obs_gral:
            obs_gral = f"[{consecutivo}] {obs_gral}".strip()

        sql_insert = text("""
            INSERT INTO transito_viaticos (
                reporte_id, estado, fecha_registro, empleado_cedula, empleado_nombre, 
                area, cargo, ciudad, categoria, fecha_gasto, ot, cc, scc, 
                valor_con_factura, valor_sin_factura, observaciones_linea, 
                observaciones_gral, usuario_id, adjuntos
            ) VALUES (
                :reporte_id, :estado, CURRENT_TIMESTAMP, :empleado_cedula, :empleado_nombre, 
                :area, :cargo, :ciudad, :categoria, :fecha_gasto, :ot, :cc, :scc, 
                :valor_con_factura, :valor_sin_factura, :observaciones_linea, 
                :observaciones_gral, :usuario_id, :adjuntos
            )
        """)

        for gasto in reporte_data["gastos"]:
            db_erp.execute(sql_insert, {
                "reporte_id": reporte_id,
                "estado": "PRE-INICIAL",
                "empleado_cedula": reporte_data["empleado_cedula"],
                "empleado_nombre": reporte_data["empleado_nombre"],
                "area": reporte_data["area"],
                "cargo": reporte_data["cargo"],
                "ciudad": reporte_data["ciudad"],
                "categoria": gasto["categoria"],
                "fecha_gasto": gasto["fecha"],
                "ot": gasto["ot"],
                "cc": gasto["cc"],
                "scc": gasto["scc"],
                "valor_con_factura": gasto["valorConFactura"],
                "valor_sin_factura": gasto["valorSinFactura"],
                "observaciones_linea": gasto.get("observaciones"),
                "observaciones_gral": obs_gral,
                "usuario_id": reporte_data["usuario_id"],
                "adjuntos": str(gasto.get("adjuntos", []))
            })
        
        db_erp.commit()
        print(f"REPORT_SUCCESS | ID: {reporte_id} | Consecutivo: {consecutivo} | Update: {es_actualizacion}")
        return str(reporte_id)

    @staticmethod
    def obtener_estado_cuenta(db_erp: Session, cedula: str, desde: Optional[date] = None, hasta: Optional[date] = None) -> List[Dict]:
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
            m.codigo, m.fechaaplicacion, m.empleado, m.nombreempleado, m.radicado,
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
        
        resultado = db_erp.execute(text(sql), params).all()
        return [dict(row._mapping) for row in resultado]

    @staticmethod
    def obtener_reportes_transito(db_erp: Session, cedula: str) -> List[Dict]:
        """Obtiene los reportes en tránsito desde el ERP"""
        sql = text("SELECT * FROM transito_viaticos WHERE empleado_cedula = :cedula")
        resultado = db_erp.execute(sql, {"cedula": cedula})
        return [dict(row._mapping) for row in resultado]

    @staticmethod
    def obtener_detalle_reporte(db_erp: Session, reporte_id: str) -> List[Dict]:
        """Obtiene todas las líneas y detalles de un reporte_id específico"""
        sql = text("SELECT * FROM transito_viaticos WHERE reporte_id = :reporte_id")
        resultado = db_erp.execute(sql, {"reporte_id": reporte_id})
        return [dict(row._mapping) for row in resultado]
