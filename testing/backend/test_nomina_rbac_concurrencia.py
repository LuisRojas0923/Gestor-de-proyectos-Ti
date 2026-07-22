"""Regresiones de seguridad y serialización del flujo compartido de nómina."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.novedades_nomina.dependencies import requiere_permiso_nomina_novedades
from app.database import obtener_db
from app.config import config
from app.main import app
from app.services.novedades_nomina.errores import ErrorEstructuraNomina
from app.services.novedades_nomina.nomina_service import NominaService


RUTAS_SENSIBLES = (
    ("GET", "/api/v2/novedades-nomina/catalogo"),
    ("GET", "/api/v2/novedades-nomina/historial"),
    ("GET", "/api/v2/novedades-nomina/archivos/1/preview"),
    ("GET", "/api/v2/novedades-nomina/archivos/1/descargar"),
    ("POST", "/api/v2/novedades-nomina/archivos"),
    ("POST", "/api/v2/novedades-nomina/archivos/1/procesar"),
    ("GET", "/api/v2/novedades-nomina/subcategorias/resumen?mes=7&a%C3%B1o=2026"),
    ("GET", "/api/v2/novedades-nomina/subcategorias/SEGUROS%20HDI?mes=7&a%C3%B1o=2026"),
    ("POST", "/api/v2/novedades-nomina/exportar-solid?mes=7&a%C3%B1o=2026"),
)


@pytest.mark.parametrize(("method", "ruta"), RUTAS_SENSIBLES)
def test_rutas_genericas_nomina_rechazan_solicitud_sin_token(method, ruta):
    client = TestClient(app, raise_server_exceptions=False)
    response = client.request(method, ruta)
    assert response.status_code == 401


@pytest.mark.parametrize(("method", "ruta"), RUTAS_SENSIBLES)
def test_rutas_genericas_nomina_rechazan_usuario_sin_permiso(method, ruta):
    async def sin_permiso():
        raise HTTPException(status_code=403, detail="Sin permiso")

    app.dependency_overrides[requiere_permiso_nomina_novedades] = sin_permiso
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.request(method, ruta)
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bloqueo_nomina_usa_clave_estable_por_periodo():
    session = AsyncMock()

    await NominaService._bloquear_periodo(
        session,
        subcategoria=" SEGUROS HDI ",
        mes=7,
        anio=2026,
    )

    statement, params = session.execute.await_args.args
    assert "pg_advisory_xact_lock" in str(statement)
    assert params == {"scope": "nomina:SEGUROS HDI:2026:7"}


@pytest.mark.asyncio
async def test_bloqueo_postgresql_serializa_dos_cargas_del_mismo_periodo():
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as first, factory() as second:
            await NominaService._bloquear_periodo(first, "SEGUROS HDI", 7, 2026)
            waiting = asyncio.create_task(
                NominaService._bloquear_periodo(second, "SEGUROS HDI", 7, 2026)
            )
            await asyncio.sleep(0.1)
            assert not waiting.done()

            await first.commit()
            await asyncio.wait_for(waiting, timeout=2)
            await second.rollback()
    finally:
        await engine.dispose()


def _registro_normalizado():
    return SimpleNamespace(
        cedula="94416010",
        nombre_asociado="PRECIADO JOSE",
        valor=100.0,
        valor_rdc=24.0,
        valor_colaborador=76.0,
        empresa="REFRIDCOL",
        concepto="PRUEBA",
        ciudad=None,
        observaciones=None,
        horas=0,
        dias=0,
        estado_validacion="OK",
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "subcategoria",
    ["MEDICINA PREPAGADA", "POLIZAS VEHICULOS", "OTROS GERENCIA"],
)
async def test_servicio_compartido_conserva_flujo_exitoso(
    tmp_path, monkeypatch, subcategoria
):
    monkeypatch.chdir(tmp_path)
    session = AsyncMock()
    session.execute.side_effect = [MagicMock(), MagicMock()]
    upload = AsyncMock()
    upload.filename = "fuente.xlsx"
    upload.read = AsyncMock(return_value=b"contenido")
    rows = [{"cedula": "94416010", "valor": 100.0}]

    with (
        patch(
            "app.services.novedades_nomina.nomina_service.ExcepcionService.obtener_excepciones_activas",
            new=AsyncMock(return_value=[]),
        ),
        patch.object(NominaService, "get_mapa_erp", new=AsyncMock(return_value={})),
        patch.object(
            NominaService,
            "crear_archivo_procesado",
            new=AsyncMock(return_value=SimpleNamespace(id=7)),
        ),
        patch.object(
            NominaService,
            "persistir_registros_normalizados",
            new=AsyncMock(return_value=[_registro_normalizado()]),
        ),
    ):
        result = await NominaService.procesar_flujo(
            session=session,
            db_erp=AsyncMock(),
            files=[upload],
            categoria="OTROS",
            subcategoria=subcategoria,
            extractor_fn=lambda _archivos: (rows, {}, []),
            extension="xlsx",
            mes=7,
            anio=2026,
        )

    assert result["archivo_id"] == 7
    assert len(result["rows"]) == 1
    assert "pg_advisory_xact_lock" in str(session.execute.await_args_list[0].args[0])
    assert "DELETE FROM nomina_registros_normalizados" in str(
        session.execute.await_args_list[1].args[0]
    )
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_servicio_compartido_revierte_si_falla_escritura(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    session = AsyncMock()
    upload = AsyncMock()
    upload.filename = "fuente.xlsx"
    upload.read = AsyncMock(return_value=b"contenido")

    with (
        patch(
            "app.services.novedades_nomina.nomina_service.ExcepcionService.obtener_excepciones_activas",
            new=AsyncMock(return_value=[]),
        ),
        patch.object(NominaService, "get_mapa_erp", new=AsyncMock(return_value={})),
        patch("builtins.open", side_effect=OSError("disco no disponible")),
        pytest.raises(OSError, match="disco no disponible"),
    ):
        await NominaService.procesar_flujo(
            session=session,
            db_erp=AsyncMock(),
            files=[upload],
            categoria="OTROS",
            subcategoria="MEDICINA PREPAGADA",
            extractor_fn=lambda _archivos: ([{"cedula": "1"}], {}, []),
            extension="xlsx",
            mes=7,
            anio=2026,
        )

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
    assert session.execute.await_count == 1


@pytest.mark.asyncio
async def test_error_estructural_seguro_llega_como_422():
    upload = AsyncMock()
    upload.filename = "hdi.xlsx"
    upload.read = AsyncMock(return_value=b"contenido")

    def extractor(_archivos):
        raise ErrorEstructuraNomina("Hoja 'HDI', fila 8: PRIMA ANUAL es inválida.")

    with pytest.raises(HTTPException) as exc_info:
        await NominaService.procesar_flujo(
            session=AsyncMock(),
            db_erp=AsyncMock(),
            files=[upload],
            categoria="OTROS",
            subcategoria="SEGUROS HDI",
            extractor_fn=extractor,
            extension="xlsx",
            mes=7,
            anio=2026,
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Hoja 'HDI', fila 8: PRIMA ANUAL es inválida."


def test_preview_no_expone_detalle_interno_en_error_500():
    session = AsyncMock()
    session.execute.side_effect = RuntimeError("postgres-password=secreto")
    app.dependency_overrides[requiere_permiso_nomina_novedades] = lambda: object()
    app.dependency_overrides[obtener_db] = lambda: session
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.get("/api/v2/novedades-nomina/archivos/1/preview")
        assert response.status_code == 500
        assert "secreto" not in response.text
    finally:
        app.dependency_overrides.clear()


def test_descarga_rechaza_ruta_fuera_del_almacenamiento():
    session = AsyncMock()
    session.get.return_value = SimpleNamespace(
        ruta_almacenamiento="../../etc/passwd",
        nombre_archivo="passwd",
    )
    app.dependency_overrides[requiere_permiso_nomina_novedades] = lambda: object()
    app.dependency_overrides[obtener_db] = lambda: session
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.get("/api/v2/novedades-nomina/archivos/1/descargar")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()
