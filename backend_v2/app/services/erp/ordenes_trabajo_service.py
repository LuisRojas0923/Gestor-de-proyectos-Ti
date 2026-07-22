"""Consultas ERP para OT/centros de costo de mano de obra."""
from typing import Dict, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from ...database import SessionErp


class OrdenesTrabajoService:
    """Servicio de lectura de ordenes de trabajo del ERP."""

    @staticmethod
    def listar_ot_mano_obra(
        db_erp: Session,
        q: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict:
        """Lista combinaciones unicas OT/CC clasificadas como M.O."""
        if limit <= 0 or limit > 100:
            limit = 20
        if offset < 0:
            offset = 0

        params = {
            "cat_mano_obra": "MANO DE OBRA",
            "cat_contrato_mo": "CONTRATO - M.O",
            "limit": limit,
            "offset": offset,
        }
        filtro_busqueda = ""
        if q:
            params["q"] = f"%{q.strip()}%"
            filtro_busqueda = """
                AND (
                    orden ILIKE :q OR descripcion ILIKE :q OR cc ILIKE :q
                    OR scc ILIKE :q OR sub_indice ILIKE :q OR cliente ILIKE :q
                )
            """

        query = text(f"""
            WITH combinaciones AS (
                SELECT DISTINCT ON (orden, cc, scc, sub_indice, categoria_sub_indice)
                    orden::text AS orden,
                    cc::text AS cc,
                    scc::text AS scc,
                    sub_indice::text AS sub_indice,
                    categoria_sub_indice::text AS categoria_sub_indice,
                    descripcion::text AS descripcion,
                    vr_contratado,
                    estado::text AS estado,
                    cliente::text AS cliente
                FROM public.basegeneralcostos
                WHERE categoria_sub_indice IN (:cat_mano_obra, :cat_contrato_mo)
                  AND orden IS NOT NULL
                  {filtro_busqueda}
                ORDER BY orden, cc, scc, sub_indice, categoria_sub_indice
            )
            SELECT *, count(*) OVER() AS total
            FROM combinaciones
            ORDER BY orden
            LIMIT :limit OFFSET :offset
        """)

        rows = db_erp.execute(query, params).fetchall()
        items = [
            {
                "orden": str(r.orden),
                "cc": r.cc,
                "scc": r.scc,
                "sub_indice": r.sub_indice,
                "categoria_sub_indice": r.categoria_sub_indice,
                "descripcion": r.descripcion,
                "vr_contratado": float(r.vr_contratado) if r.vr_contratado is not None else None,
                "estado": r.estado,
                "cliente": r.cliente,
            }
            for r in rows
        ]
        total = int(getattr(rows[0], "total", len(rows))) if rows else 0
        return {"items": items, "total": total, "limit": limit, "offset": offset}

    @staticmethod
    def listar_ot_horarios(
        db_erp: Session,
        q: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict:
        """Lista las OT habilitadas para el planificador desde OThorarios."""
        if limit <= 0 or limit > 100:
            limit = 20
        if offset < 0:
            offset = 0

        termino = q.strip() if q and q.strip() else None
        termino_ilike = (
            termino.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            if termino else None
        )
        params = {
            "q": f"%{termino_ilike}%" if termino_ilike else None,
            "limit": limit,
            "offset": offset,
        }
        query = text("""
            WITH combinaciones AS (
                SELECT DISTINCT ON (orden, cc, scc, sub_indice, categoria_sub_indice)
                    orden::text AS orden,
                    cc::text AS cc,
                    scc::text AS scc,
                    sub_indice::text AS sub_indice,
                    categoria_sub_indice::text AS categoria_sub_indice,
                    descripcion::text AS descripcion,
                    vr_contratado,
                    estado::text AS estado,
                    cliente::text AS cliente
                FROM public.OThorarios
                WHERE orden IS NOT NULL
                  AND categoria_sub_indice IS NOT NULL
                  AND (
                      :q IS NULL
                      OR orden::text ILIKE :q ESCAPE '\\'
                      OR descripcion::text ILIKE :q ESCAPE '\\'
                      OR cc::text ILIKE :q ESCAPE '\\'
                      OR scc::text ILIKE :q ESCAPE '\\'
                      OR sub_indice::text ILIKE :q ESCAPE '\\'
                      OR cliente::text ILIKE :q ESCAPE '\\'
                  )
                ORDER BY orden, cc, scc, sub_indice, categoria_sub_indice,
                         descripcion::text NULLS LAST, cliente::text NULLS LAST,
                         estado::text NULLS LAST, vr_contratado NULLS LAST
            )
            , pagina AS (
                SELECT *
                FROM combinaciones
                ORDER BY orden, cc, scc, sub_indice, categoria_sub_indice
                LIMIT :limit OFFSET :offset
            ), total AS (
                SELECT count(*) AS total FROM combinaciones
            )
            SELECT pagina.*, total.total
            FROM total
            LEFT JOIN pagina ON TRUE
            ORDER BY orden, cc, scc, sub_indice, categoria_sub_indice
        """)

        rows = db_erp.execute(query, params).fetchall()
        items = [
            {
                "orden": str(row.orden),
                "cc": row.cc,
                "scc": row.scc,
                "sub_indice": row.sub_indice,
                "categoria_sub_indice": row.categoria_sub_indice,
                "descripcion": row.descripcion,
                "vr_contratado": (
                    float(row.vr_contratado)
                    if row.vr_contratado is not None else None
                ),
                "estado": row.estado,
                "cliente": row.cliente,
            }
            for row in rows
            if row.orden is not None
        ]
        total = int(getattr(rows[0], "total", len(rows))) if rows else 0
        return {"items": items, "total": total, "limit": limit, "offset": offset}

def consultar_ots_mano_obra_worker(
    q: Optional[str], limit: int, offset: int
) -> Dict:
    db_erp = SessionErp()
    try:
        return OrdenesTrabajoService.listar_ot_mano_obra(
            db_erp, q=q, limit=limit, offset=offset
        )
    finally:
        db_erp.close()


def consultar_ots_horarios_worker(
    q: Optional[str], limit: int, offset: int
) -> Dict:
    """Ejecuta la consulta OThorarios y cierra la sesion dentro del worker."""
    db_erp = SessionErp()
    try:
        return OrdenesTrabajoService.listar_ot_horarios(
            db_erp, q=q, limit=limit, offset=offset
        )
    finally:
        db_erp.close()
