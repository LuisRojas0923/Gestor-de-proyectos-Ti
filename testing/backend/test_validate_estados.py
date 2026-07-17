from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.exc import SQLAlchemyError

from validate_estados import consultar_estados


@pytest.mark.asyncio
async def test_consultar_estados_devuelve_filas():
    fila = object()
    resultado = MagicMock()
    resultado.fetchall.return_value = [fila]
    db = AsyncMock()
    db.execute.return_value = resultado

    filas = await consultar_estados(db)

    assert filas == [fila]


@pytest.mark.asyncio
async def test_consultar_estados_controla_error_de_base_de_datos():
    db = AsyncMock()
    db.execute.side_effect = SQLAlchemyError("DB no disponible")

    filas = await consultar_estados(db)

    assert filas == []
