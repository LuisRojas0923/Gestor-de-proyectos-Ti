"""Rutas GET de descarga/exportación que deben auditarse (no todo GET)."""
import re
from typing import Any, Optional

from starlette.requests import Request

# Inventario de endpoints que devuelven archivos al cliente:
# - novedades_nomina/nomina_router.py  GET /archivos/{id}/descargar
# - tickets/router.py                  GET /adjuntos/{id}/archivo
# - impuestos.py                       GET /template, GET /certificado-220/{ano}
# - inventario/router.py               GET /plantilla-maestra, /plantilla-transito
# - viaticos/router.py                 GET /estado-cuenta/xlsx

_PATRONES_DESCARGA = (
    re.compile(r"^/api/v2/novedades-nomina/archivos/\d+/descargar$"),
    re.compile(r"^/api/v2/soporte/adjuntos/\d+/archivo$"),
    re.compile(r"^/api/v2/impuestos/template$"),
    re.compile(r"^/api/v2/impuestos/certificado-220/\d+$"),
    re.compile(r"^/api/v2/inventario/plantilla-maestra$"),
    re.compile(r"^/api/v2/inventario/plantilla-transito$"),
    re.compile(r"^/api/v2/viaticos/estado-cuenta/xlsx$"),
)

_ENTIDAD_DESCARGA = (
    (re.compile(r"^/api/v2/novedades-nomina/archivos/(\d+)/descargar$"), "archivo_nomina", 1),
    (re.compile(r"^/api/v2/soporte/adjuntos/(\d+)/archivo$"), "adjunto_ticket", 1),
    (re.compile(r"^/api/v2/impuestos/certificado-220/(\d+)$"), "certificado_220", 1),
    (re.compile(r"^/api/v2/impuestos/template$"), "plantilla_impuestos", None),
    (re.compile(r"^/api/v2/inventario/plantilla-maestra$"), "plantilla_inventario", "maestra"),
    (re.compile(r"^/api/v2/inventario/plantilla-transito$"), "plantilla_inventario", "transito"),
    (re.compile(r"^/api/v2/viaticos/estado-cuenta/xlsx$"), "exportacion_viaticos", None),
)

_PARAMS_DESCARGA = frozenset({
    "cedula",
    "cedula_target",
    "desde",
    "hasta",
    "ano",
    "ano_gravable",
})

# Consultas GET sensibles del módulo comisiones (nómina)
_PATRONES_CONSULTA_COMISIONES = (
    re.compile(r"^/api/v2/novedades-nomina/comisiones/datos$"),
)


def normalizar_ruta(path: str) -> str:
    return path.rstrip("/") or "/"


def es_ruta_descarga_auditable(path: str) -> bool:
    ruta = normalizar_ruta(path)
    return any(p.match(ruta) for p in _PATRONES_DESCARGA)


def es_ruta_consulta_comisiones_auditable(path: str) -> bool:
    ruta = normalizar_ruta(path)
    return any(p.match(ruta) for p in _PATRONES_CONSULTA_COMISIONES)


def inferir_entidad_descarga(path: str) -> tuple[Optional[str], Optional[str]]:
    ruta = normalizar_ruta(path)
    for patron, tipo, grupo in _ENTIDAD_DESCARGA:
        coincidencia = patron.match(ruta)
        if not coincidencia:
            continue
        if grupo is None:
            return tipo, None
        if isinstance(grupo, int):
            return tipo, coincidencia.group(grupo)
        return tipo, str(grupo)
    return None, None


def extraer_metadatos_descarga(request: Request) -> Optional[dict[str, Any]]:
    if not es_ruta_descarga_auditable(request.url.path):
        return None
    meta = {
        clave: request.query_params[clave]
        for clave in _PARAMS_DESCARGA
        if clave in request.query_params
    }
    return meta or None
