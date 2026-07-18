from unittest.mock import AsyncMock

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.services.lineas_corporativas.facturas_service import (
    normalizar_periodo_factura,
    preparar_reimportacion_factura,
)


@pytest.mark.asyncio
async def test_preparar_reimportacion_bloquea_y_limpia_ambas_tablas():
    db = AsyncMock()

    await preparar_reimportacion_factura(db, "2026-06")

    assert db.execute.await_count == 3
    llamadas = db.execute.await_args_list
    assert "pg_advisory_xact_lock" in str(llamadas[0].args[0])
    assert llamadas[0].args[1] == {"clave": "factura-lineas:2026-06"}
    assert "facturas_lineas_detalle" in str(llamadas[1].args[0])
    assert "facturas_lineas" in str(llamadas[2].args[0])


def test_normalizar_periodo_factura_elimina_espacios_y_valida_formato():
    assert normalizar_periodo_factura(" 2026-06 ") == "2026-06"

    with pytest.raises(ValueError, match="AAAA-MM"):
        normalizar_periodo_factura("06/2026")

    with pytest.raises(ValueError, match="AAAA-MM"):
        normalizar_periodo_factura("2026-13")


@pytest.mark.asyncio
async def test_preparar_reimportacion_rechaza_periodo_vacio():
    db = AsyncMock()

    with pytest.raises(ValueError, match="periodo"):
        await preparar_reimportacion_factura(db, "   ")

    db.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_preparar_reimportacion_propaga_error_db():
    db = AsyncMock()
    db.execute.side_effect = SQLAlchemyError("db no disponible")

    with pytest.raises(SQLAlchemyError):
        await preparar_reimportacion_factura(db, "2026-06")

    db.execute.assert_awaited_once()
