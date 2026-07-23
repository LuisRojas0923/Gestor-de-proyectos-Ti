"""Regresiones para límites, redacción y migraciones de Novedades de Nómina."""

import io
import re
from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest
import app


def _extractor_prueba(_archivos):
    return [], {}, []
from fastapi import FastAPI, Request, UploadFile
from starlette.datastructures import Headers


@pytest.mark.asyncio
async def test_middleware_limita_carga_nomina_sin_content_length():
    from app.core.middleware.limite_carga_actividad import (
        LimiteCargaActividadMiddleware,
    )

    app = FastAPI()
    app.add_middleware(LimiteCargaActividadMiddleware, max_body_size=10)

    @app.post("/api/v2/novedades-nomina/celulares/preview")
    async def recibir(request: Request):
        await request.body()
        return {"ok": True}

    async def contenido_chunked():
        yield b"123456"
        yield b"789012"

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v2/novedades-nomina/celulares/preview",
            content=contenido_chunked(),
        )

    assert response.status_code == 413


@pytest.mark.asyncio
async def test_lector_nomina_rechaza_firma_incompatible():
    from app.services.novedades_nomina.validacion_archivos_nomina import (
        ArchivoNominaInvalido,
        leer_archivos_nomina,
    )

    archivo = UploadFile(
        filename="nomina.xlsx",
        file=io.BytesIO(b"%PDF-1.7 contenido disfrazado"),
        headers=Headers({"content-type": "application/pdf"}),
    )

    with pytest.raises(ArchivoNominaInvalido, match="firma|MIME"):
        await leer_archivos_nomina([archivo], extensiones_permitidas={".xlsx"})


@pytest.mark.asyncio
async def test_lector_nomina_corta_archivo_sobredimensionado(monkeypatch):
    from app.services.novedades_nomina import validacion_archivos_nomina as modulo

    monkeypatch.setattr(modulo, "MAX_BYTES_ARCHIVO", 8)
    archivo = UploadFile(
        filename="nomina.csv",
        file=io.BytesIO(b"cedula,valor\n123,100"),
        headers=Headers({"content-type": "text/csv"}),
    )

    with pytest.raises(modulo.ArchivoNominaInvalido, match="supera"):
        await modulo.leer_archivos_nomina(
            [archivo], extensiones_permitidas={".csv"}
        )


@pytest.mark.asyncio
async def test_migracion_toma_advisory_lock_antes_del_ddl():
    from app.core.migrations.nomina_excepciones_migration import (
        asegurar_historial_excepcion_unico,
    )

    class ConexionFalsa:
        def __init__(self):
            self.sentencias = []

        async def execute(self, statement):
            self.sentencias.append(str(statement))

    conn = ConexionFalsa()
    await asegurar_historial_excepcion_unico(conn)

    assert "pg_advisory_xact_lock" in conn.sentencias[0]


def test_routers_nomina_no_exponen_excepciones_en_respuestas_500():
    root = Path(app.__file__).parent / "api/novedades_nomina"
    patron = re.compile(
        r"HTTPException\s*\(\s*status_code\s*=\s*500\s*,\s*"
        r"detail\s*=\s*(?:str\s*\(|f['\"][^'\"]*\{(?:e|exc)(?:!s)?\})"
    )
    hallazgos = []
    for path in root.rglob("*.py"):
        for numero, linea in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if patron.search(linea):
                hallazgos.append(f"{path}:{numero}")

    assert hallazgos == []


def test_routers_nomina_no_escriben_archivos_sincronicamente():
    root = Path(app.__file__).parent / "api/novedades_nomina"
    hallazgos = []
    for path in root.rglob("*.py"):
        for numero, linea in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if "with open(" in linea and '"wb"' in linea:
                hallazgos.append(f"{path}:{numero}")

    assert hallazgos == []


@pytest.mark.parametrize(
    "secreto",
    [
        "SELECT * FROM nomina password=secreto",
        "C:\\datos\\nomina\\archivo.xlsx",
        "erp-interno.local:1433 empleado=123456",
    ],
)
def test_error_interno_redacta_sql_rutas_y_erp(secreto):
    from app.services.novedades_nomina.errores_http import error_interno

    try:
        raise RuntimeError(secreto)
    except RuntimeError:
        respuesta = error_interno("Fallo controlado de prueba")

    assert secreto not in respuesta.detail
    assert secreto not in str(respuesta.headers)
    assert respuesta.detail == "No fue posible completar la operación."


def test_todas_las_cargas_nomina_tienen_rate_limit():
    from app.core.rate_limiter import limiter
    from app.main import app as api

    limitadas = set(limiter._route_limits)
    cargas = [
        route
        for route in api.routes
        if getattr(route, "path", "").startswith("/api/v2/novedades-nomina/")
        and "POST" in getattr(route, "methods", set())
        and (route.path.endswith("/preview") or route.path.endswith("/archivos"))
    ]
    assert cargas
    for route in cargas:
        clave = f"{route.endpoint.__module__}.{route.endpoint.__name__}"
        assert clave in limitadas, f"Carga sin rate limit: {route.path}"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("ruta", "nombre", "contenido", "mime"),
    [
        ("/control_descuentos/preview", "invalido.xlsx", b"%PDF", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("/bogota_libranza/preview", "invalido.xlsx", b"%PDF", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("/l_davivienda/preview", "invalido.xlsx", b"%PDF", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("/occidente_libranza/preview", "invalido.xlsx", b"%PDF", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("/camposanto/preview", "invalido.pdf", b"no-pdf", "application/pdf"),
        ("/recordar/preview", "invalido.xlsx", b"%PDF", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ],
)
async def test_previews_directos_traducen_archivo_invalido_a_4xx(
    ruta, nombre, contenido, mime
):
    from app.api.novedades_nomina.dependencies import requiere_permiso_nomina_novedades
    from app.core.rate_limiter import limiter
    from app.database import obtener_db, obtener_erp_db_opcional
    from app.main import app as api

    api.dependency_overrides[requiere_permiso_nomina_novedades] = lambda: object()
    api.dependency_overrides[obtener_db] = lambda: AsyncMock()
    api.dependency_overrides[obtener_erp_db_opcional] = lambda: None
    limiter.enabled = False
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=api), base_url="http://test"
        ) as client:
            response = await client.post(
                f"/api/v2/novedades-nomina{ruta}",
                data={"mes": "7", "anio": "2026"},
                files={"files": (nombre, contenido, mime)},
            )
    finally:
        limiter.enabled = True
        api.dependency_overrides.clear()

    assert response.status_code in {413, 415}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("ruta", "subcategoria"),
    [
        ("/celulares/preview", "CELULARES"),
        ("/retenciones/preview", "RETENCIONES"),
        ("/embargos/preview", "EMBARGOS"),
    ],
)
async def test_previews_financieros_delegan_al_servicio_serializado(
    ruta, subcategoria
):
    from app.api.novedades_nomina.dependencies import requiere_permiso_nomina_novedades
    from app.core.rate_limiter import limiter
    from app.database import obtener_db, obtener_erp_db_opcional
    from app.main import app as api
    from app.services.novedades_nomina.nomina_service import NominaService
    from unittest.mock import patch

    api.dependency_overrides[requiere_permiso_nomina_novedades] = lambda: object()
    api.dependency_overrides[obtener_db] = lambda: AsyncMock()
    api.dependency_overrides[obtener_erp_db_opcional] = lambda: None
    limiter.enabled = False
    procesar = AsyncMock(return_value={"rows": [], "summary": {}})
    try:
        with patch.object(NominaService, "procesar_flujo", new=procesar):
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=api), base_url="http://test"
            ) as client:
                response = await client.post(
                    f"/api/v2/novedades-nomina{ruta}",
                    data={"mes": "7", "anio": "2026"},
                    files={"files": ("nomina.xlsx", b"PK", "application/octet-stream")},
                )
    finally:
        limiter.enabled = True
        api.dependency_overrides.clear()

    assert response.status_code == 200
    assert procesar.await_args.kwargs["subcategoria"] == subcategoria


@pytest.mark.asyncio
async def test_almacenamiento_atomico_limpia_temporal_si_falla_replace(
    tmp_path, monkeypatch
):
    from app.services.novedades_nomina import almacenamiento

    destino = tmp_path / "nomina" / "archivo.xlsx"
    monkeypatch.setattr(almacenamiento, "MIN_FREE_DISK_BYTES", 0)
    monkeypatch.setattr(
        almacenamiento.os,
        "replace",
        lambda *_args: (_ for _ in ()).throw(OSError("replace falló")),
    )

    with pytest.raises(OSError, match="replace falló"):
        await almacenamiento.guardar_archivo_nomina(str(destino), b"contenido")

    assert not destino.exists()
    assert [
        path for path in destino.parent.iterdir() if path.name != ".quota.lock"
    ] == []


@pytest.mark.asyncio
async def test_almacenamiento_rechaza_cuota_agotada(tmp_path, monkeypatch):
    from app.services.novedades_nomina import almacenamiento

    destino = tmp_path / "nomina" / "archivo.xlsx"
    monkeypatch.setattr(almacenamiento, "MAX_STORAGE_NOMINA_BYTES", 1)
    monkeypatch.setattr(almacenamiento, "MIN_FREE_DISK_BYTES", 0)

    with pytest.raises(OSError, match="cuota"):
        await almacenamiento.guardar_archivo_nomina(str(destino), b"contenido")

    assert not destino.exists()


@pytest.mark.asyncio
async def test_almacenamiento_serializa_cuota_entre_escritores(tmp_path, monkeypatch):
    import asyncio
    from app.services.novedades_nomina import almacenamiento

    carpeta = tmp_path / "nomina"
    monkeypatch.setattr(almacenamiento, "MAX_STORAGE_NOMINA_BYTES", 10)
    monkeypatch.setattr(almacenamiento, "MIN_FREE_DISK_BYTES", 0)
    resultados = await asyncio.gather(
        almacenamiento.guardar_archivo_nomina(str(carpeta / "uno.xlsx"), b"123456"),
        almacenamiento.guardar_archivo_nomina(str(carpeta / "dos.xlsx"), b"123456"),
        return_exceptions=True,
    )

    assert sum(resultado is None for resultado in resultados) == 1
    assert sum(isinstance(resultado, OSError) for resultado in resultados) == 1
    assert sum(
        path.stat().st_size
        for path in carpeta.iterdir()
        if path.name != ".quota.lock"
    ) == 6


@pytest.mark.asyncio
async def test_extractor_produccion_usa_proceso_y_sanea_warnings():
    from unittest.mock import AsyncMock, patch
    from app.services.novedades_nomina.procesamiento_seguro import (
        ejecutar_extractor_seguro,
    )

    ejecutar = AsyncMock(return_value=(
        [{"cedula": "1"}],
        {},
        ["Error leyendo C:\\datos\\secreto.xlsx password=123"],
    ))
    with patch(
        "app.services.novedades_nomina.procesamiento_seguro.to_process.run_sync",
        new=ejecutar,
    ):
        _rows, _summary, warnings = await ejecutar_extractor_seguro(
            _extractor_prueba, [b"archivo"]
        )

    assert ejecutar.await_count == 1
    assert ejecutar.await_args.kwargs["cancellable"] is True
    assert warnings == ["Un archivo no pudo procesarse completamente."]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("ruta", "data"),
    [
        ("/archivos", {"mes": "7", "año": "2026", "subcategoria": "PRUEBA"}),
        ("/celulares/preview", {"mes": "7", "anio": "2026"}),
    ],
)
async def test_cargas_generica_y_compartida_responden_413_por_tamano(
    ruta, data, monkeypatch
):
    from app.api.novedades_nomina.dependencies import requiere_permiso_nomina_novedades
    from app.core.rate_limiter import limiter
    from app.database import obtener_db, obtener_erp_db_opcional
    from app.main import app as api
    from app.services.novedades_nomina import validacion_archivos_nomina as validacion

    monkeypatch.setattr(validacion, "MAX_BYTES_ARCHIVO", 8)
    api.dependency_overrides[requiere_permiso_nomina_novedades] = lambda: object()
    api.dependency_overrides[obtener_db] = lambda: AsyncMock()
    api.dependency_overrides[obtener_erp_db_opcional] = lambda: None
    limiter.enabled = False
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=api), base_url="http://test"
        ) as client:
            response = await client.post(
                f"/api/v2/novedades-nomina{ruta}",
                data=data,
                files={"file" if ruta == "/archivos" else "files": (
                    "grande.xlsx",
                    b"PK\x03\x0412345",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )},
            )
    finally:
        limiter.enabled = True
        api.dependency_overrides.clear()

    assert response.status_code == 413
