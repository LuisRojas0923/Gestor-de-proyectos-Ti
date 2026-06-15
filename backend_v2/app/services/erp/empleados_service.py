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
