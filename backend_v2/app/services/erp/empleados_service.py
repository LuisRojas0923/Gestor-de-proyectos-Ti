import logging
from typing import List, Dict, Optional

from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from sqlalchemy import text


logger = logging.getLogger(__name__)


def _normalizar_nivel_riesgo(valor: Optional[str]) -> str:
    """
    Convierte el valor textual de `contrato.riesgoarl` (ej. 'Riesgo I 0.522%')
    en código de nivel ARL (I, II, III, IV, V). Si no se reconoce, devuelve 'I'
    (nivel más bajo, carga prestacional menor).
    """
    if not valor:
        return "I"
    v = str(valor).strip().upper()
    # Match exacto primero
    if v in ("I", "II", "III", "IV", "V"):
        return v
    # Prefijos en orden de mayor a menor longitud para que "III" no matchee "I"
    for nivel in ("V", "IV", "III", "II", "I"):
        if v.startswith(f"NIVEL {nivel}") or v.startswith(f"RIESGO {nivel}"):
            return nivel
    # Si llega como porcentaje, mapear inversamente
    mapping_pct = {
        0.522: "I",
        1.044: "II",
        2.436: "III",
        4.350: "IV",
        6.960: "V",
    }
    for pct, nivel in mapping_pct.items():
        if str(pct) in v.replace(",", "."):
            return nivel
    return "I"

def _normalizar_bool(valor):
    if valor is None:
        return None
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, (int, float)):
        return valor != 0
    v = str(valor).strip().lower()
    if v in {"true", "t", "1", "s", "si", "sí", "y", "yes"}:
        return True
    if v in {"false", "f", "0", "n", "no"}:
        return False
    return None


def _existe_columna(db_erp: Session, tabla: str, columna: str) -> bool:
    try:
        query = text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = ANY(current_schemas(false))
                  AND lower(table_name) = :tabla
                  AND lower(column_name) = :columna
            ) AS existe
        """)
        row = db_erp.execute(
            query,
            {"tabla": tabla.lower(), "columna": columna.lower()},
        ).first()
        return bool(row.existe) if row else False
    except Exception:
        return False


def normalizar_bool_erp(valor, default: bool = False) -> bool:
    normalizado = _normalizar_bool(valor)
    return default if normalizado is None else normalizado


class EmpleadosService:
    """Lógica para la consulta de empleados y sincronización con el ERP externo"""

    @staticmethod
    def obtener_empleado_por_cedula_sync(db_erp: Session, cedula: str, solo_activos: bool = True) -> Optional[Dict]:
        """Consulta un empleado en la base de datos del ERP por su cedula"""
        logger.debug("Consultando empleado en ERP solo_activos=%s", solo_activos)

        # Filtro de estado dinámico
        estado_filtro = "AND C.estado = 'Activo'" if solo_activos else ""

        query = text(f"""
            SELECT DISTINCT ON (E.nrocedula)
                E.nrocedula      AS "nrocedula",
                E.nombre::text   AS "nombre",
                C.cargo::text    AS "cargo",
                C.area::text     AS "area",
                C.estado::text   AS "estado",
                C.empresa::text  AS "empresa",
                C.ciudadcontratacion::text AS "ciudadcontratacion",
                E.viaticante,
                E.baseviaticos,
                C.centrocosto::text AS "centrocosto",
                C.jefe::text        AS "jefe",
                C.fecharetiro       AS "fecharetiro",
                C.riesgoarl::text   AS "riesgoarl",
                B.autorizacionhorasextras AS "autoriza_he",
                B.salario AS "salario",
                E.correocorporativo
            FROM establecimiento E
            LEFT JOIN contrato C
                ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
                {estado_filtro}
            LEFT JOIN beneficio B
                ON TRIM(CAST(B.contrato AS TEXT)) = TRIM(CAST(C.numerocontrato AS TEXT))
                AND B.estado = 'Activo'
            WHERE TRIM(CAST(E.nrocedula AS TEXT)) = :cedula
            ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
        """)

        resultado = db_erp.execute(query, {"cedula": cedula.strip()}).first()
        if resultado:
            if solo_activos and (resultado.estado or "").strip().lower() != "activo":
                return None
            return {
                "nrocedula": str(resultado.nrocedula),
                "nombre": resultado.nombre,
                "cargo": resultado.cargo,
                "area": resultado.area,
                "empresa": resultado.empresa,
                "estado": resultado.estado,
                "ciudadcontratacion": resultado.ciudadcontratacion,
                "viaticante": resultado.viaticante,
                "baseviaticos": float(resultado.baseviaticos) if resultado.baseviaticos is not None else 0.0,
                "centrocosto": resultado.centrocosto,
                "jefe": resultado.jefe,
                "fecharetiro": str(resultado.fecharetiro) if resultado.fecharetiro else None,
                "correocorporativo": resultado.correocorporativo,
                # --- Campos para módulo Horas Extras (S0) ---
                "nivel_riesgo_arl": _normalizar_nivel_riesgo(resultado.riesgoarl),
                "autoriza_he": bool(resultado.autoriza_he) if resultado.autoriza_he is not None else False,
                "salario_base_mensual": float(resultado.salario) if resultado.salario is not None else None,
                "correo_sincronizado": True
            }
        return None

    @staticmethod
    async def obtener_empleado_por_cedula(db_erp: Session, cedula: str, solo_activos: bool = True) -> Optional[Dict]:
        return await run_in_threadpool(
            EmpleadosService.obtener_empleado_por_cedula_sync,
            db_erp,
            cedula,
            solo_activos,
        )

    @staticmethod
    async def validar_empleado_activo_autogestion(db_erp: Session, cedula: str) -> Optional[Dict]:
        """Valida autogestion contra ERP. Falla cerrado si no hay contrato activo."""
        if not db_erp:
            return None
        try:
            empleado = await EmpleadosService.obtener_empleado_por_cedula(
                db_erp, cedula, solo_activos=True
            )
        except Exception:
            logger.warning("ERP no disponible durante validacion de autogestion")
            return None
        if not empleado:
            return None
        if (empleado.get("estado") or "").strip().lower() != "activo":
            return None
        return empleado

    @staticmethod
    def consultar_empleados_bulk(db_erp: Session, cedulas: List[str]) -> Dict[str, Dict]:
        """
        Consulta masiva al ERP: devuelve {cedula: {nombre, estado, empresa}}
        para todas las cédulas proporcionadas (activos e inactivos).
        """
        if not cedulas:
            return {}

        # Construir placeholders dinámicos para IN clause
        placeholders = ", ".join(f":c{i}" for i in range(len(cedulas)))
        params = {f"c{i}": ced for i, ced in enumerate(cedulas)}

        query = text(f"""
            SELECT DISTINCT ON (E.nrocedula)
                E.nrocedula      AS "nrocedula",
                E.nombre::text   AS "nombre",
                C.estado::text   AS "estado",
                C.empresa::text  AS "empresa",
                C.ciudadcontratacion::text AS "ciudadcontratacion"
            FROM establecimiento E
            LEFT JOIN contrato C
                ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
            WHERE E.nrocedula IN ({placeholders})
            ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
        """)

        resultados = db_erp.execute(query, params).fetchall()
        mapa: Dict[str, Dict] = {}
        for r in resultados:
            mapa[str(r.nrocedula).strip()] = {
                "nombre": r.nombre,
                "estado": r.estado or "Desconocido",
                "empresa": r.empresa or "",
                "ciudadcontratacion": r.ciudadcontratacion or "",
            }
        return mapa

    @staticmethod
    async def consultar_empleados_bulk_async(
        db_erp: Session,
        cedulas: List[str],
    ) -> Dict[str, Dict]:
        return await run_in_threadpool(
            EmpleadosService.consultar_empleados_bulk,
            db_erp,
            cedulas,
        )

    @staticmethod
    def actualizar_correo_erp_sync(
        db_erp: Session,
        cedula: str,
        nuevo_correo: str,
    ) -> bool:
        try:
            logger.info("Actualizando correo corporativo en ERP")
            query = text("""
                UPDATE establecimiento 
                SET correocorporativo = :correo
                WHERE TRIM(CAST(nrocedula AS TEXT)) = :cedula
            """)
            db_erp.execute(query, {"correo": nuevo_correo, "cedula": cedula})
            db_erp.commit()
            return True
        except Exception:
            logger.exception("Error al actualizar correo corporativo en ERP")
            db_erp.rollback()
            return False

    @staticmethod
    async def actualizar_correo_erp(
        db_erp: Session,
        cedula: str,
        nuevo_correo: str,
    ) -> bool:
        """Actualiza el correo corporativo en ERP fuera del event loop."""
        return await run_in_threadpool(
            EmpleadosService.actualizar_correo_erp_sync,
            db_erp,
            cedula,
            nuevo_correo,
        )

    @staticmethod
    def listar_empleados_paginado(
        db_erp: Session,
        q: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        solo_activos: bool = True,
        cedulas_permitidas: Optional[List[str]] = None,
        sin_paginar: bool = False,
    ) -> Dict:
        """Sprint S7: lista paginada de empleados del ERP con búsqueda opcional.

        Args:
            q: filtro case-insensitive sobre cedula/nombre (LIKE %q%). None = sin filtro.
            limit: maximo de filas a devolver (cap 100).
            offset: desplazamiento para paginacion.
            solo_activos: si True, solo empleados con contrato activo.

        Returns:
            {"items": List[Dict], "total": int}
        """
        if limit <= 0 or limit > 100:
            limit = 20
        if offset < 0:
            offset = 0

        estado_join_filtro = "AND C.estado = 'Activo'" if solo_activos else ""
        estado_where_filtro = "AND C.estado = 'Activo'" if solo_activos else ""
        tiene_jefe = _existe_columna(db_erp, "contrato", "jefe")
        tiene_fecha_inicio = _existe_columna(db_erp, "contrato", "fechainicio")
        tiene_contrato_numero = _existe_columna(db_erp, "contrato", "numerocontrato")
        tiene_beneficio_autoriza = all([
            tiene_contrato_numero,
            _existe_columna(db_erp, "beneficio", "contrato"),
            _existe_columna(db_erp, "beneficio", "autorizacionhorasextras"),
        ])
        tiene_beneficio_estado = _existe_columna(db_erp, "beneficio", "estado")

        select_reporta = 'C.jefe::text AS "quien_reporta"' if tiene_jefe else 'NULL::text AS "quien_reporta"'
        if tiene_beneficio_autoriza:
            select_autoriza = 'B.autorizacionhorasextras AS "autoriza_he"'
            estado_beneficio = "AND B.estado = 'Activo'" if tiene_beneficio_estado else ""
            join_beneficio = f"""
            LEFT JOIN beneficio B
                ON TRIM(CAST(B.contrato AS TEXT)) = TRIM(CAST(C.numerocontrato AS TEXT))
                {estado_beneficio}
            """
        else:
            select_autoriza = 'NULL::boolean AS "autoriza_he"'
            join_beneficio = ""
        where_clauses = ["1=1"]
        params = {"limit": limit, "offset": offset}
        if q:
            campos_busqueda = [
                "CAST(E.nrocedula AS TEXT) ILIKE :q",
                "E.nombre::text ILIKE :q",
                "C.cargo::text ILIKE :q",
                "C.area::text ILIKE :q",
                "C.ciudadcontratacion::text ILIKE :q",
            ]
            if tiene_jefe:
                campos_busqueda.append("C.jefe::text ILIKE :q")
            if tiene_beneficio_autoriza:
                campos_busqueda.append("CAST(B.autorizacionhorasextras AS TEXT) ILIKE :q")
            where_clauses.append(f"({' OR '.join(campos_busqueda)})")
            params["q"] = f"%{q.strip()}%"
        if cedulas_permitidas is not None:
            if not cedulas_permitidas:
                return {"items": [], "total": 0}
            where_clauses.append("TRIM(CAST(E.nrocedula AS TEXT)) = ANY(:cedulas_permitidas)")
            params["cedulas_permitidas"] = list(cedulas_permitidas)

        where_sql = " AND ".join(where_clauses)

        paginacion_sql = "" if sin_paginar else "LIMIT :limit OFFSET :offset"
        orden_contrato = (
            ", C.numerocontrato DESC NULLS LAST" if tiene_contrato_numero else ""
        )
        orden_fecha = ", C.fechainicio DESC NULLS LAST" if tiene_fecha_inicio else ""
        query = text(f"""
            SELECT DISTINCT ON (E.nrocedula)
                E.nrocedula      AS "nrocedula",
                E.nombre::text   AS "nombre",
                C.cargo::text    AS "cargo",
                C.area::text     AS "area",
                C.ciudadcontratacion::text AS "ciudadcontratacion",
                C.estado::text AS "contrato_estado",
                {select_reporta},
                {select_autoriza}
            FROM establecimiento E
            LEFT JOIN contrato C
                ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
                {estado_join_filtro}
            {join_beneficio}
            WHERE {where_sql} {estado_where_filtro}
            ORDER BY E.nrocedula{orden_fecha}{orden_contrato}
            {paginacion_sql}
        """)
        rows = db_erp.execute(query, params).fetchall()

        if sin_paginar:
            total = len(rows)
        else:
            count_query = text(f"""
                SELECT COUNT(DISTINCT E.nrocedula) AS "total"
                FROM establecimiento E
                LEFT JOIN contrato C
                    ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
                    {estado_join_filtro}
                {join_beneficio}
                WHERE {where_sql} {estado_where_filtro}
            """)
            total_row = db_erp.execute(count_query, params).first()
            total = int(total_row.total) if total_row else 0

        items = []
        for r in rows:
            contrato_estado = getattr(
                r, "contrato_estado", "Activo" if solo_activos else None
            )
            items.append({
                "cedula": str(r.nrocedula).strip(),
                "nombre": r.nombre,
                "cargo": r.cargo,
                "area": r.area,
                "ciudadcontratacion": r.ciudadcontratacion,
                "activo": contrato_estado == "Activo",
                "quien_reporta": r.quien_reporta,
                "nivel_riesgo_arl": None,
                "autoriza_he": _normalizar_bool(r.autoriza_he),
            })
        return {"items": items, "total": total}

    @staticmethod
    async def consultar_solicitudes_externas(empresa: Optional[str] = None) -> List[Dict]:
        """Consulta directa al API del ERP (Mock inicial)"""
        return [
            {
                "solicitud_id": "ERP-001",
                "asunto": "Mejora Módulo Compras",
                "usuario": "Juan Perez",
                "prioridad": "Alta"
            }
        ]

    @staticmethod
    def obtener_todos_los_empleados_activos(db_erp: Session) -> List[Dict]:
        """Consulta todos los empleados activos en la base de datos del ERP"""
        query = text("""
            SELECT DISTINCT ON (E.nrocedula)
                E.nrocedula      AS "nrocedula",
                E.nombre::text   AS "nombre",
                C.estado::text   AS "estado",
                C.empresa::text  AS "empresa"
            FROM establecimiento E
            LEFT JOIN contrato C
                ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
            WHERE C.estado = 'Activo'
            ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
        """)
        resultados = db_erp.execute(query).fetchall()
        return [
            {
                "nrocedula": str(r.nrocedula).strip(),
                "nombre": r.nombre,
                "estado": r.estado or "Desconocido",
                "empresa": r.empresa or ""
            } for r in resultados
        ]

    @staticmethod
    async def obtener_todos_los_empleados_activos_async(
        db_erp: Session,
    ) -> List[Dict]:
        return await run_in_threadpool(
            EmpleadosService.obtener_todos_los_empleados_activos,
            db_erp,
        )

    @staticmethod
    async def sincronizar_solicitudes(db: Session):
        """Descarga solicitudes del ERP y las crea en la BD local"""
        solicitudes = await EmpleadosService.consultar_solicitudes_externas()
        return len(solicitudes)
