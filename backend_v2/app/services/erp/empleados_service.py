from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

class EmpleadosService:
    """Lógica para la consulta de empleados y sincronización con el ERP externo"""
    
    @staticmethod
    async def obtener_empleado_por_cedula(db_erp: Session, cedula: str) -> Optional[Dict]:
        """Consulta un empleado en la base de datos del ERP por su cedula"""
        print(f"DEBUG: Consultando empleado cedula={cedula} en ERP...")
        query = text("""
            SELECT DISTINCT ON (E.nrocedula)
                E.nrocedula      AS "nrocedula",
                E.nombre::text   AS "nombre",
                C.cargo::text    AS "cargo",
                C.area::text     AS "area",
                C.estado::text   AS "estado",
                C.ciudadcontratacion::text AS "ciudadcontratacion",
                E.viaticante,
                E.baseviaticos,
                C.centrocosto::text AS "centrocosto"
            FROM establecimiento E
            LEFT JOIN contrato C
                ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
            WHERE TRIM(CAST(E.nrocedula AS TEXT)) = :cedula
              AND C.estado = 'Activo'
            ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
        """)
        
        resultado = db_erp.execute(query, {"cedula": cedula}).first()
        if resultado:
            return {
                "nrocedula": str(resultado.nrocedula),
                "nombre": resultado.nombre,
                "cargo": resultado.cargo,
                "area": resultado.area,
                "estado": resultado.estado,
                "ciudadcontratacion": resultado.ciudadcontratacion,
                "viaticante": resultado.viaticante,
                "baseviaticos": float(resultado.baseviaticos) if resultado.baseviaticos is not None else 0.0,
                "centrocosto": resultado.centrocosto
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
                C.empresa::text  AS "empresa"
            FROM establecimiento E
            LEFT JOIN contrato C
                ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
            WHERE TRIM(CAST(E.nrocedula AS TEXT)) IN ({placeholders})
            ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
        """)

        resultados = db_erp.execute(query, params).fetchall()
        mapa: Dict[str, Dict] = {}
        for r in resultados:
            mapa[str(r.nrocedula).strip()] = {
                "nombre": r.nombre,
                "estado": r.estado or "Desconocido",
                "empresa": r.empresa or "",
            }
        return mapa

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
