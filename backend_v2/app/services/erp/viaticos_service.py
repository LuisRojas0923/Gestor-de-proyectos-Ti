from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
import uuid
import json

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
        
        # Generar o Recuperar Consecutivo Amigable (Formato REP-LXXXX)
        # Lo usaremos también como reporte_id para el vínculo entre tablas
        try:
            sql_count = text("SELECT COUNT(DISTINCT reporte_id) FROM legalizaciones_transito")
            count = db_erp.execute(sql_count).scalar() or 0
            
            reporte_id_str = reporte_data.get("reporte_id")
            es_actualizacion = bool(reporte_id_str and len(str(reporte_id_str)) > 5)
            
            if es_actualizacion:
                # Si ya tiene el formato amigable [REP-L...] o REP-L..., lo limpiamos
                if "[" in str(reporte_id_str):
                    # Quitar corchetes si los tiene
                    consecutivo = str(reporte_id_str).replace("[", "").replace("]", "")
                elif "REP-L" in str(reporte_id_str):
                    consecutivo = str(reporte_id_str)
                else:
                    # Si es un UUID antiguo, generamos consecutivo nuevo sin corchetes
                    consecutivo = f"REP-L{(count + 1):04d}"
            else:
                consecutivo = f"REP-L{(count + 1):04d}"
        except:
            consecutivo = "REP-LAUTO"

        # Si es actualización, LIMPIAMOS las líneas previas antes de re-insertar (Upsert Lógico)
        # Usamos el ID recibido (UUID o antiguo) para asegurar que se borre el registro previo
        if es_actualizacion:
            print(f"DEBUG: Borrando registro previo {reporte_id_str} para actualizar a {consecutivo}")
            db_erp.execute(text("DELETE FROM transito_viaticos WHERE reporte_id = :rid"), {"rid": reporte_id_str})
            db_erp.execute(text("DELETE FROM legalizaciones_transito WHERE reporte_id = :rid"), {"rid": reporte_id_str})

        reporte_id = consecutivo # Ahora el ID amigable es el vínculo oficial
        
        obs_gral = reporte_data.get("observaciones_gral", "")
        
        # Calcular Totales y Anexos
        total_acumulado = sum(float(g["valorConFactura"] or 0) + float(g["valorSinFactura"] or 0) for g in reporte_data["gastos"])
        tiene_anexos = 1 if any(len(g.get("adjuntos", [])) > 0 for g in reporte_data["gastos"]) else 0

        # Obtener Centro de Costo del Empleado (Dato nuevo)
        cc_empleado = reporte_data.get("centrocosto") or "POR-DEFINIR"

        # 1. Insertar Cabecera (legalizaciones_transito)
        # Convertir usuario_id (cédula) a integer para compatibilidad Java/ERP
        try:
            usuario_int = int(reporte_data["usuario_id"])
        except (ValueError, TypeError):
            usuario_int = 0  # Fallback si no es numérico

        sql_header = text("""
            INSERT INTO legalizaciones_transito (
                codigolegalizacion, fecha, hora, fechaaplicacion, empleado, nombreempleado, 
                area, valortotal, estado, usuario, observaciones, 
                anexo, centrocosto, cargo, ciudad, reporte_id
            ) VALUES (
                :codigolegalizacion, CURRENT_DATE, CURRENT_TIME, CURRENT_DATE, :empleado, :nombreempleado,
                :area, :valortotal, :estado, :usuario, :observaciones,
                :anexo, :centrocosto, :cargo, :ciudad, :reporte_id
            ) RETURNING codigo
        """)
        
        result_header = db_erp.execute(sql_header, {
            "codigolegalizacion": "",  # Campo en blanco como pidió el usuario
            "empleado": reporte_data["empleado_cedula"],
            "nombreempleado": reporte_data["empleado_nombre"],
            "area": reporte_data["area"],
            "valortotal": total_acumulado,
            "estado": reporte_data.get("estado", "PRE-INICIAL"),
            "usuario": usuario_int,  # Integer como espera el ERP
            "observaciones": obs_gral,
            "anexo": tiene_anexos,
            "centrocosto": cc_empleado,
            "cargo": reporte_data["cargo"],
            "ciudad": reporte_data["ciudad"],
            "reporte_id": reporte_id
        })
        
        cabecera_id_numerico = result_header.scalar()

        # 2. Insertar Detalles (transito_viaticos)
        sql_insert = text("""
            INSERT INTO transito_viaticos (
                legalizacion, fecha, fecharealgasto, categoria, ot, 
                centrocosto, subcentrocosto, valorconfactura, valorsinfactura, 
                observaciones, reporte_id, estado, fecha_registro, 
                empleado_cedula, empleado_nombre, area, cargo, ciudad, 
                observaciones_gral, usuario_id, adjuntos
            ) VALUES (
                :legalizacion, :fecha, :fecharealgasto, :categoria, :ot, 
                :centrocosto, :subcentrocosto, :valorconfactura, :valorsinfactura, 
                :observaciones, :reporte_id, :estado, CURRENT_TIMESTAMP, 
                :empleado_cedula, :empleado_nombre, :area, :cargo, :ciudad, 
                :observaciones_gral, :usuario_id, :adjuntos
            )
        """)

        for gasto in reporte_data["gastos"]:
            db_erp.execute(sql_insert, {
                "legalizacion": cabecera_id_numerico,
                "fecha": date.today(), # Fecha de creacion de la linea
                "fecharealgasto": gasto["fecha"],
                "categoria": gasto["categoria"],
                "ot": gasto["ot"],
                "centrocosto": gasto["cc"],
                "subcentrocosto": gasto["scc"],
                "valorconfactura": gasto["valorConFactura"],
                "valorsinfactura": gasto["valorSinFactura"],
                "observaciones": gasto.get("observaciones"),
                "reporte_id": reporte_id,
                "estado": reporte_data.get("estado", "PRE-INICIAL"),
                "empleado_cedula": reporte_data["empleado_cedula"],
                "empleado_nombre": reporte_data["empleado_nombre"],
                "area": reporte_data["area"],
                "cargo": reporte_data["cargo"],
                "ciudad": reporte_data["ciudad"],
                "observaciones_gral": obs_gral,
                "usuario_id": usuario_int,  # Integer como espera el ERP
                "adjuntos": json.dumps(gasto.get("adjuntos", []))
            })
        
        db_erp.commit()
        print(f"REPORT_SUCCESS | ID: {reporte_id} | Consecutivo: {consecutivo} | Total: {total_acumulado}")
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
    def obtener_resumen_legalizaciones(db_erp: Session, cedula: str) -> List[Dict]:
        """Consulta el listado agrupado de legalizaciones desde la tabla de cabecera con todos los campos"""
        sql = text("""
            SELECT 
                codigo, codigolegalizacion, fecha, hora, fechaaplicacion,
                empleado, nombreempleado, area, valortotal, estado,
                usuario, observaciones, anexo, centrocosto, cargo, ciudad,
                reporte_id
            FROM legalizaciones_transito 
            WHERE empleado = :cedula
            ORDER BY fecha DESC, hora DESC
        """)
        resultado = db_erp.execute(sql, {"cedula": cedula})
        return [dict(row._mapping) for row in resultado]

    @staticmethod
    def obtener_detalle_reporte(db_erp: Session, reporte_id: str) -> List[Dict]:
        """Obtiene todas las líneas y detalles de un reporte_id específico"""
        sql = text("SELECT * FROM transito_viaticos WHERE reporte_id = :reporte_id")
        resultado = db_erp.execute(sql, {"reporte_id": reporte_id})
        return [dict(row._mapping) for row in resultado]

    @staticmethod
    def eliminar_reporte(db_erp: Session, reporte_id: str):
        """Elimina físicamente un reporte y sus líneas de las tablas de tránsito"""
        try:
            # Eliminar detalles
            db_erp.execute(text("DELETE FROM transito_viaticos WHERE reporte_id = :rid"), {"rid": reporte_id})
            # Eliminar cabecera
            db_erp.execute(text("DELETE FROM legalizaciones_transito WHERE reporte_id = :rid"), {"rid": reporte_id})
            db_erp.commit()
            print(f"REPORT_DELETE_SUCCESS | ID: {reporte_id}")
        except Exception as e:
            db_erp.rollback()
            raise e
