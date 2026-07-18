"""Operaciones transaccionales para importaciones de facturas corporativas."""
import re

from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.linea_corporativa.factura_detalle_model import FacturaLineaDetalle
from app.models.linea_corporativa.factura_model import FacturaLinea


def normalizar_periodo_factura(periodo: str) -> str:
    periodo_normalizado = periodo.strip()
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", periodo_normalizado):
        raise ValueError("El periodo debe tener formato AAAA-MM")
    return periodo_normalizado


async def preparar_reimportacion_factura(db: AsyncSession, periodo: str) -> str:
    """Serializa y reemplaza los datos financieros del mismo período."""
    periodo_normalizado = normalizar_periodo_factura(periodo)

    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:clave))"),
        {"clave": f"factura-lineas:{periodo_normalizado}"},
    )
    await db.execute(
        delete(FacturaLineaDetalle).where(
            FacturaLineaDetalle.periodo == periodo_normalizado
        )
    )
    await db.execute(
        delete(FacturaLinea).where(FacturaLinea.periodo == periodo_normalizado)
    )
    return periodo_normalizado
