"""Regresiones de serialización para cargas manuales de nómina."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.novedades_nomina.nomina_manual_service import NominaManualService
from app.services.novedades_nomina.nomina_service import NominaService


@pytest.mark.asyncio
async def test_flujo_manual_bloquea_antes_de_cargar_excepciones():
    eventos = []
    session = AsyncMock()

    async def bloquear(*_args, **_kwargs):
        eventos.append("lock")

    async def excepciones(*_args, **_kwargs):
        eventos.append("excepciones")
        return []

    registro = SimpleNamespace(
        cedula="9912345678",
        nombre_asociado="PRUEBA",
        valor=10,
        empresa="REFRIDCOL",
        concepto="OTROS-GERENCIA FONDO COMUN",
        estado_validacion="OK",
    )
    with (
        patch.object(NominaService, "_bloquear_periodo", side_effect=bloquear),
        patch(
            "app.services.novedades_nomina.nomina_manual_service.ExcepcionService.obtener_excepciones_activas",
            side_effect=excepciones,
        ),
        patch.object(NominaService, "get_mapa_erp", new=AsyncMock(return_value={})),
        patch.object(
            NominaService,
            "crear_archivo_procesado",
            new=AsyncMock(return_value=SimpleNamespace(id=1)),
        ),
        patch.object(
            NominaService,
            "persistir_registros_normalizados",
            new=AsyncMock(return_value=[registro]),
        ),
    ):
        await NominaManualService.procesar_manual_otros_gerencia(
            session=session,
            db_erp=AsyncMock(),
            data=[{"cedula": "9912345678", "fondo_comun": 10}],
            mes=7,
            anio=2026,
        )

    assert eventos == ["lock", "excepciones"]
