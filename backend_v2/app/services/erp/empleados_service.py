from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text


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


class EmpleadosService:
    """Lógica para la consulta de empleados y sincronización con el ERP externo"""
    
    @staticmethod
    async def obtener_empleado_por_cedula(db_erp: Session, cedula: str, solo_activos: bool = True) -> Optional[Dict]:
        """Consulta un empleado en la base de datos del ERP por su cedula"""
        print(f"DEBUG: Consultando empleado cedula={cedula} en ERP (solo_activos={solo_activos})...")

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
                B.autorizahe        AS "autoriza_he",
                E.correocorporativo
            FROM establecimiento E
            LEFT JOIN contrato C
                ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
                {estado_filtro}
            LEFT JOIN beneficio B
                ON TRIM(CAST(B.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
                AND B.estado = 'Activo'
            WHERE TRIM(CAST(E.nrocedula AS TEXT)) = :cedula
            ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
        """)

        resultado = db_erp.execute(query, {"cedula": cedula.strip()}).first()
        if resultado:
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
                "correo_sincronizado": True
            }
        return None

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
    async def actualizar_correo_erp(db_erp: Session, cedula: str, nuevo_correo: str) -> bool:
        """Actualiza el correo corporativo y el flag de sincronización en el ERP (Solid)"""
        try:
            print(f"DEBUG: Actualizando correo ERP para cedula={cedula} -> {nuevo_correo}")
            query = text("""
                UPDATE establecimiento 
                SET correocorporativo = :correo
                WHERE TRIM(CAST(nrocedula AS TEXT)) = :cedula
            """)
            db_erp.execute(query, {"correo": nuevo_correo, "cedula": cedula})
            db_erp.commit()
            return True
        except Exception as e:
            print(f"ERROR al actualizar correo en ERP: {e}")
            db_erp.rollback()
            return False

    @staticmethod
    def listar_empleados_paginado(
        db_erp: Session,
        q: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        solo_activos: bool = True,
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
        tiene_regional = _existe_columna(db_erp, "contrato", "regional")
        tiene_contrato_numero = _existe_columna(db_erp, "contrato", "numerocontrato")
        tiene_beneficio_autoriza = all([
            tiene_contrato_numero,
            _existe_columna(db_erp, "beneficio", "contrato"),
            _existe_columna(db_erp, "beneficio", "autorizacionhorasextras"),
        ])
        tiene_beneficio_estado = _existe_columna(db_erp, "beneficio", "estado")

        select_reporta = 'C.regional::text AS "quien_reporta"' if tiene_regional else 'NULL::text AS "quien_reporta"'
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
            where_clauses.append(
                "(CAST(E.nrocedula AS TEXT) ILIKE :q OR E.nombre::text ILIKE :q)"
            )
            params["q"] = f"%{q.strip()}%"

        where_sql = " AND ".join(where_clauses)

        query = text(f"""
            SELECT DISTINCT ON (E.nrocedula)
                E.nrocedula      AS "nrocedula",
                E.nombre::text   AS "nombre",
                C.cargo::text    AS "cargo",
                C.area::text     AS "area",
                C.ciudadcontratacion::text AS "ciudadcontratacion",
                {select_reporta},
                {select_autoriza}
            FROM establecimiento E
            LEFT JOIN contrato C
                ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
                {estado_join_filtro}
            {join_beneficio}
            WHERE {where_sql} {estado_where_filtro}
            ORDER BY E.nrocedula
            LIMIT :limit OFFSET :offset
        """)
        rows = db_erp.execute(query, params).fetchall()

        count_query = text(f"""
            SELECT COUNT(DISTINCT E.nrocedula) AS "total"
            FROM establecimiento E
            LEFT JOIN contrato C
                ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
                {estado_join_filtro}
            WHERE {where_sql} {estado_where_filtro}
        """)
        total_row = db_erp.execute(count_query, params).first()
        total = int(total_row.total) if total_row else 0

        items = []
        for r in rows:
            items.append({
                "cedula": str(r.nrocedula).strip(),
                "nombre": r.nombre,
                "cargo": r.cargo,
                "area": r.area,
                "ciudadcontratacion": r.ciudadcontratacion,
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
    async def sincronizar_solicitudes(db: Session):
        """Descarga solicitudes del ERP y las crea en la BD local"""
        solicitudes = await EmpleadosService.consultar_solicitudes_externas()
        return len(solicitudes)
