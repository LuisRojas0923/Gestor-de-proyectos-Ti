"""Consultas ERP para OT/centros de costo de mano de obra."""
from typing import Dict, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from ...database import SessionErp


class OrdenesTrabajoService:
    """Servicio de lectura contra public.basegeneralcostos del ERP."""

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
