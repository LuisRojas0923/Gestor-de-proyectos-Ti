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

        # Generar o Recuperar Consecutivo Amigable (Formato WEB-LXXXX)
        try:
            reporte_id_val = reporte_data.get("reporte_id")
            # Un ID amigable siempre empieza por WEB-L. Los UUIDs no.
            # Robustez: Asegurar que sea string y no sea "null" literal ni vacío
            es_actualizacion = bool(
                reporte_id_val
                and isinstance(reporte_id_val, str)
                and "WEB-L" in reporte_id_val
                and reporte_id_val.strip().lower() != "null"
            )

            if es_actualizacion:
                consecutivo = str(reporte_id_val).strip()
            else:
                # Generación robusta: buscar el último número usado para evitar duplicados por huecos
                sql_max = text("""
                    SELECT reporte_id FROM legalizaciones_transito 
                    WHERE reporte_id LIKE 'WEB-L%' 
                    ORDER BY length(reporte_id) DESC, reporte_id DESC 
                    LIMIT 1
                """)
                max_val = db_erp.execute(sql_max).scalar()

                if max_val:
                    try:
                        # Extraer solo los números del string (p.ej. WEB-L0005 -> 5)
                        num_str = "".join(filter(str.isdigit, max_val))
                        nuevo_num = int(num_str) + 1 if num_str else 1
                    except:
                        # Fallback a conteo si falla el parseo numérico
                        sql_count = text("SELECT COUNT(*) FROM legalizaciones_transito")
                        nuevo_num = (db_erp.execute(sql_count).scalar() or 0) + 1
                else:
                    nuevo_num = 1

                consecutivo = f"WEB-L{nuevo_num:04d}"
        except Exception as e:
            print(f"DEBUG_ID_GEN_ERROR: {e}")
            consecutivo = f"WEB-L{uuid.uuid4().hex[:6].upper()}"

        # Si es actualización, VALIDAR ESTADO y luego LIMPIAR líneas previas
        if es_actualizacion:
            # Blindaje: No permitir modificar si ya está PROCESADO
            sql_check = text(
                "SELECT estado FROM legalizaciones_transito WHERE reporte_id = :rid"
            )
            estado_actual = db_erp.execute(sql_check, {"rid": reporte_id_val}).scalar()

            if estado_actual and estado_actual not in ["BORRADOR", "INICIAL"]:
                print(
                    f"SECURITY_ALERT: Intento de modificar reporte bloqueado {reporte_id_val} en estado {estado_actual}"
                )
                raise Exception(
                    f"Este reporte se encuentra bloqueado (Estado: {estado_actual}). Ya no es posible realizar cambios o guardar."
                )

            print(f"DEBUG_ERP: Actualizando reporte {reporte_id_val} -> {consecutivo}")
            del_detalles = db_erp.execute(
                text("DELETE FROM transito_viaticos WHERE reporte_id = :rid"),
                {"rid": reporte_id_val},
            ).rowcount
            del_cabecera = db_erp.execute(
                text("DELETE FROM legalizaciones_transito WHERE reporte_id = :rid"),
                {"rid": reporte_id_val},
            ).rowcount
            print(
                f"DEBUG_ERP: Limpieza finalizada. (Filas eliminadas: Transito={del_detalles}, Cabecera={del_cabecera})"
            )

        reporte_id = consecutivo
        obs_gral = reporte_data.get("observaciones_gral", "")

        # Blindaje: Evitar que se acumulen etiquetas [WEB-LXXXX] si ya existen en las observaciones
        import re

        obs_gral = re.sub(r"\[WEB-L\d+\]\s*", "", obs_gral).strip()

        # Calcular Totales y Anexos
        total_acumulado = sum(
            float(g["valorConFactura"] or 0) + float(g["valorSinFactura"] or 0)
            for g in reporte_data["gastos"]
        )
        tiene_anexos = (
            1
            if any(len(g.get("adjuntos", [])) > 0 for g in reporte_data["gastos"])
            else 0
        )

        # Obtener Centro de Costo del Empleado
        cc_empleado = reporte_data.get("centrocosto") or "POR-DEFINIR"

        # 1. Insertar Cabecera (legalizaciones_transito)
        try:
            # Limpiar cualquier caracter no numérico de la cédula del usuario
            clean_uid = "".join(
                filter(str.isdigit, str(reporte_data.get("usuario_id", "0")))
            )
            usuario_int = int(clean_uid) if clean_uid else 0
        except (ValueError, TypeError):
            usuario_int = 0

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

        try:
            result_header = db_erp.execute(
                sql_header,
                {
                    "codigolegalizacion": str(reporte_id),
                    "empleado": str(reporte_data["empleado_cedula"]),
                    "nombreempleado": str(reporte_data["empleado_nombre"]),
                    "area": str(reporte_data["area"]),
                    "valortotal": float(total_acumulado),
                    "estado": str(reporte_data.get("estado", "INICIAL")),
                    "usuario": usuario_int,
                    "observaciones": obs_gral.strip(),
                    "anexo": int(tiene_anexos),
                    "centrocosto": str(
                        cc_empleado
                        if cc_empleado and cc_empleado != "---"
                        else "POR-DEFINIR"
                    ),
                    "cargo": str(reporte_data["cargo"]),
                    "ciudad": str(reporte_data["ciudad"]),
                    "reporte_id": str(reporte_id),
                },
            )

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
                    :observaciones_gral, :usuario_id, CAST(:adjuntos AS jsonb)
                )
            """)

            for gasto in reporte_data["gastos"]:
                db_erp.execute(
                    sql_insert,
                    {
                        "legalizacion": cabecera_id_numerico,
                        "fecha": date.today(),
                        "fecharealgasto": gasto["fecha"],
                        "categoria": str(gasto["categoria"]),
                        "ot": str(gasto["ot"]),
                        "centrocosto": str(gasto["cc"]),
                        "subcentrocosto": str(gasto["scc"]),
                        "valorconfactura": float(gasto["valorConFactura"] or 0),
                        "valorsinfactura": float(gasto["valorSinFactura"] or 0),
                        "observaciones": str(gasto.get("observaciones", "")),
                        "reporte_id": str(reporte_id),
                        "estado": str(reporte_data.get("estado", "INICIAL")),
                        "empleado_cedula": str(reporte_data["empleado_cedula"]),
                        "empleado_nombre": str(reporte_data["empleado_nombre"]),
                        "area": str(reporte_data["area"]),
                        "cargo": str(reporte_data["cargo"]),
                        "ciudad": str(reporte_data["ciudad"]),
                        "observaciones_gral": str(obs_gral),
                        "usuario_id": usuario_int,
                        "adjuntos": json.dumps(gasto.get("adjuntos", [])),
                    },
                )

            db_erp.commit()
            print(f"REPORT_SUCCESS | ID: {reporte_id} | Total: {total_acumulado}")
            return str(reporte_id)

        except Exception as e:
            db_erp.rollback()
            print(f"CRITICAL_ERP_ERROR: {str(e)}")
            raise e

    @staticmethod
    def obtener_estado_cuenta(
        db_erp: Session,
        cedula: str,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> List[Dict]:
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
            raise e

    @staticmethod
    def eliminar_reporte(db_erp: Session, reporte_id: str):
        """Elimina físicamente un reporte y sus líneas de las tablas de tránsito"""
        try:
            # Eliminar detalles
            db_erp.execute(
                text("DELETE FROM transito_viaticos WHERE reporte_id = :rid"),
                {"rid": reporte_id},
            )
            # Eliminar cabecera
            db_erp.execute(
                text("DELETE FROM legalizaciones_transito WHERE reporte_id = :rid"),
                {"rid": reporte_id},
            )
            db_erp.commit()
            print(f"REPORT_DELETE_SUCCESS | ID: {reporte_id}")
        except Exception as e:
            db_erp.rollback()
            raise e
