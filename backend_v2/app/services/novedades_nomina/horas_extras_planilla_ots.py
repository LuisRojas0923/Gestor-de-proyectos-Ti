"""Consulta y proyección de metadatos OT para la planilla."""
from typing import Optional

from sqlalchemy import text


def _texto(value) -> Optional[str]:
    normalizado = str(value).strip() if value is not None else ""
    return normalizado or None


def _consultar_ots_bulk(db_erp, claves: set[tuple[str, str, str, str]]) -> dict:
    ordenes = sorted({clave[0] for clave in claves if clave[0]})
    if not ordenes:
        return {}
    placeholders = ", ".join(f":orden{i}" for i in range(len(ordenes)))
    params = {f"orden{i}": orden for i, orden in enumerate(ordenes)}
    rows = db_erp.execute(text(f"""
        SELECT DISTINCT ON (orden, cc, scc, sub_indice)
            orden::text AS orden, cc::text AS cc, scc::text AS scc,
            sub_indice::text AS sub_indice, descripcion::text AS descripcion,
            cliente::text AS cliente
        FROM public.OThorarios
        WHERE orden::text IN ({placeholders})
        ORDER BY orden, cc, scc, sub_indice,
                 descripcion::text NULLS LAST, cliente::text NULLS LAST
    """), params).fetchall()
    return {
        (
            str(row.orden).strip(),
            str(row.cc).strip() if row.cc is not None else "",
            str(row.scc).strip() if row.scc is not None else "",
            str(row.sub_indice).strip() if row.sub_indice is not None else "",
        ): {"descripcion": row.descripcion, "cliente": row.cliente}
        for row in rows
    }


def _clave_ot(asignacion) -> tuple[str, str, str, str]:
    return (
        _texto(getattr(asignacion, "orden", None)) or "",
        _texto(getattr(asignacion, "cc", None)) or "",
        _texto(getattr(asignacion, "scc", None)) or "",
        _texto(getattr(asignacion, "sub_indice", None)) or "",
    )


def _metadata_ot(asignacion, ots: dict) -> tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    metadata = ots.get(_clave_ot(asignacion), {})
    ot_cc = _texto(getattr(asignacion, "cc", None)) or _texto(getattr(asignacion, "orden", None))
    sub_subc = _texto(getattr(asignacion, "scc", None)) or _texto(getattr(asignacion, "sub_indice", None))
    especialidad = _texto(getattr(asignacion, "descripcion", None)) or _texto(metadata.get("descripcion"))
    return ot_cc, sub_subc, especialidad, _texto(metadata.get("cliente"))
