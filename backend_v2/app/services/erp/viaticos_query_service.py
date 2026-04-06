from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date

class ViaticosQueryService:
    """Consultas relacionadas al ERP (Solid) para viáticos"""

    @staticmethod
    def buscar_ots(db_erp: Session, query: Optional[str] = None) -> List[Dict]:
        """Busca OTs en la tabla otviaticos del ERP"""
        try:
            sql = "SELECT numero, MAX(especialidad) as especialidad, MAX(cliente) as cliente, MAX(ciudad) as ciudad FROM otviaticos"
            params = {}

            if query:
                sql += " WHERE numero LIKE :query OR cliente LIKE :query"
                params = {"query": f"%{query}%"}

            sql += " GROUP BY numero LIMIT 50"

            resultado = db_erp.execute(text(sql), params).all()
            return [dict(row._mapping) for row in resultado]
        except Exception as e:
            print(f"ERROR ERP Buscar OTs: {e}")
            return []

    @staticmethod
    def obtener_combinaciones_ot(db_erp: Session, numero: str) -> List[Dict]:
        """Obtiene todas las combinaciones de CC/SCC para una OT específica"""
        try:
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
        except Exception as e:
            print(f"ERROR ERP Combinaciones OT: {e}")
            return []

    @staticmethod
    def obtener_estado_cuenta(
        db_erp: Session,
        cedula: str,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> List[Dict]:
        """Obtiene el estado de cuenta detallado de viáticos desde el ERP"""
        try:
            sql = """
            WITH movimientos AS (
                SELECT 
                    codigo, fechaaplicacion, empleado, nombreempleado, 
                    codigoconsignacion AS radicado, valor::numeric AS valor, 
                    'CONSIGNACION' AS tipo, UPPER(TRIM(estado)) AS estado_limpio, 
                    observaciones 
                FROM consignacion
                WHERE UPPER(TRIM(estado)) != 'ANULADO'
                UNION ALL
                SELECT 
                    codigo, fechaaplicacion, empleado, nombreempleado, 
                    codigolegalizacion AS radicado, valortotal::numeric AS valor, 
                    'LEGALIZACION' AS tipo, UPPER(TRIM(estado)) AS estado_limpio, 
                    observaciones 
                FROM legalizacion
                WHERE UPPER(TRIM(estado)) != 'ANULADO'
            )
            SELECT 
                m.codigo, m.fechaaplicacion, m.empleado, m.nombreempleado, m.radicado, m.tipo,
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
        except Exception as e:
            print(f"ERROR ERP Estado Cuenta: {e}")
            return []

    @staticmethod
    def obtener_todas_legalizaciones(db_erp: Session) -> List[Dict]:
        """Consulta todas las legalizaciones del portal (vista director) con valores finales si están procesadas"""
        try:
            sql = text("""
                SELECT 
                    l.codigo, l.codigolegalizacion, l.fecha, l.hora, l.fechaaplicacion,
                    l.empleado, l.nombreempleado, l.area, 
                    COALESCE(e.valortotal, l.valortotal) as valortotal, 
                    l.estado,
                    l.usuario, 
                    COALESCE(e.observaciones, l.observaciones) as observaciones, 
                    l.anexo, l.centrocosto, l.cargo, l.ciudad,
                    l.reporte_id,
                    (SELECT COUNT(*) FROM transito_viaticos t WHERE t.reporte_id::text = l.reporte_id) as total_lineas
                FROM legalizaciones_transito l
                LEFT JOIN legalizacion e ON l.codigolegalizacion = e.codigolegalizacion
                ORDER BY l.fecha DESC, l.hora DESC
            """)
            resultado = db_erp.execute(sql)
            return [dict(row._mapping) for row in resultado]
        except Exception as e:
            print(f"ERROR ERP Legalizaciones Todas: {e}")
            return []

    @staticmethod
    def obtener_resumen_legalizaciones(db_erp: Session, cedula: str) -> List[Dict]:
        """Consulta el listado agrupado de legalizaciones con valores finales del ERP si están procesadas"""
        try:
            sql = text("""
                SELECT 
                    l.codigo, l.codigolegalizacion, l.fecha, l.hora, l.fechaaplicacion,
                    l.empleado, l.nombreempleado, l.area, 
                    COALESCE(e.valortotal, l.valortotal) as valortotal, 
                    l.estado,
                    l.usuario, 
                    COALESCE(e.observaciones, l.observaciones) as observaciones, 
                    l.anexo, l.centrocosto, l.cargo, l.ciudad,
                    l.reporte_id
                FROM legalizaciones_transito l
                LEFT JOIN legalizacion e ON l.codigolegalizacion = e.codigolegalizacion
                WHERE l.empleado = :cedula
                ORDER BY l.fecha DESC, l.hora DESC
            """)
            resultado = db_erp.execute(sql, {"cedula": cedula})
            return [dict(row._mapping) for row in resultado]
        except Exception as e:
            print(f"ERROR ERP Resumen Legalizaciones: {e}")
            return []

    @staticmethod
    def obtener_detalle_reporte(db_erp: Session, reporte_id: str) -> List[Dict]:
        """
        Obtiene todas las líneas y detalles de un reporte_id específico.
        """
        try:
            # 1. Verificar estado actual en tránsito
            sql_estado = text(
                "SELECT codigolegalizacion, estado FROM legalizaciones_transito WHERE reporte_id = :rid"
            )
            res_info = db_erp.execute(sql_estado, {"rid": reporte_id}).first()

            estado = str(res_info.estado).upper().strip() if res_info else "BORRADOR"
            radicado = res_info.codigolegalizacion if res_info else None

            # 2. Si está PROCESADO, buscar en tablas finales oficiales
            if estado == "PROCESADO" and radicado:
                sql_final_head = text("SELECT codigo FROM legalizacion WHERE codigolegalizacion = :rad")
                id_final = db_erp.execute(sql_final_head, {"rad": radicado}).scalar()

                if id_final:
                    sql_final_lines = text("""
                        SELECT 
                            l.fecharealgasto,
                            COALESCE(c.descripcion, l.categoria) as categoria,
                            l.ot,
                            l.centrocosto,
                            l.subcentrocosto,
                            l.valorconfactura,
                            l.valorsinfactura,
                            l.observaciones
                        FROM linealegalizacion l
                        LEFT JOIN categorialegalizacion c ON l.categoria = c.codigo::text
                        WHERE l.legalizacion = :lid
                        ORDER BY l.codigo ASC
                    """)
                    resultado = db_erp.execute(sql_final_lines, {"lid": id_final}).all()
                    
                    if resultado:
                        return [dict(row._mapping) for row in resultado]

            # 3. Fallback: Consultar en tablas de tránsito
            sql = text("SELECT * FROM transito_viaticos WHERE reporte_id = :reporte_id")
            resultado = db_erp.execute(sql, {"reporte_id": reporte_id})
            return [dict(row._mapping) for row in resultado]
        except Exception as e:
            print(f"ERROR ERP Detalle Reporte: {e}")
            return []

    @staticmethod
    def obtener_categorias_legalizacion(db_erp: Session) -> List[Dict]:
        """Obtiene el listado de categorías de legalización desde el ERP"""
        try:
            sql = text(
                "SELECT descripcion as label, descripcion as value FROM categorialegalizacion ORDER BY descripcion ASC"
            )
            resultado = db_erp.execute(sql).all()
            return [dict(row._mapping) for row in resultado]
        except Exception as e:
            print(f"ERROR ERP Categorias: {e}")
            return []
