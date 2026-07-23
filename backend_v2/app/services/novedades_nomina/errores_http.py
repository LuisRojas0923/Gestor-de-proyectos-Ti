"""Construcción uniforme de errores internos sin filtrar detalles sensibles."""

import logging
from uuid import uuid4

from fastapi import HTTPException


logger = logging.getLogger("app.novedades_nomina")


def error_interno(contexto: str) -> HTTPException:
    """Registra la excepción activa y devuelve un error público estable."""
    referencia = uuid4().hex[:12]
    logger.error("%s [referencia=%s]", contexto, referencia)
    return HTTPException(
        status_code=500,
        detail="No fue posible completar la operación.",
        headers={"X-Error-Id": referencia},
    )


def resumen_error_interno() -> str:
    """Texto persistible que no contiene SQL, rutas, ERP ni PII."""
    return f"Error interno. Referencia: {uuid4().hex[:12]}"
