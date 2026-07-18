import io
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from zipfile import ZipFile

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.routing import APIRoute
from httpx import ASGITransport, AsyncClient
from starlette.datastructures import Headers

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.api.novedades_nomina import nomina_router
from app.api.novedades_nomina.dependencies import requiere_permiso_nomina_novedades
from app.core.rate_limiter import limiter
from app.database import obtener_db, obtener_erp_db_opcional
from app.main import app
from app.services.novedades_nomina.validacion_archivos_cooperativas import (
    MAX_BYTES_ARCHIVO,
    leer_archivos_beneficiar,
    leer_archivos_grancoop,
)


RUTAS_NOMINA_SENSIBLES = (
    ("POST", "/api/v2/novedades-nomina/archivos"),
    ("POST", "/api/v2/novedades-nomina/archivos/{archivo_id}/procesar"),
    ("GET", "/api/v2/novedades-nomina/archivos/{archivo_id}/preview"),
    ("GET", "/api/v2/novedades-nomina/archivos/{archivo_id}/descargar"),
    ("GET", "/api/v2/novedades-nomina/subcategorias/resumen"),
    ("GET", "/api/v2/novedades-nomina/subcategorias/{subcat}"),
    ("GET", "/api/v2/novedades-nomina/historial"),
    ("POST", "/api/v2/novedades-nomina/exportar-solid"),
)


def _dependencias_ruta(path: str, method: str) -> set[str]:
    ruta = next(
        ruta
        for ruta in app.routes
        if isinstance(ruta, APIRoute)
        and ruta.path == path
        and method in ruta.methods
    )
    return {
        getattr(dependencia.call, "__name__", "")
        for dependencia in ruta.dependant.dependencies
    }


@pytest.mark.parametrize(("method", "path"), RUTAS_NOMINA_SENSIBLES)
def test_rutas_genericas_nomina_exigen_permiso(method, path):
    assert "requiere_permiso_nomina_novedades" in _dependencias_ruta(path, method)


def test_catalogo_nomina_conserva_acceso_publico():
    dependencias = _dependencias_ruta("/api/v2/novedades-nomina/catalogo", "GET")
    assert "requiere_permiso_nomina_novedades" not in dependencias


def test_subrouters_generales_nomina_exigen_permiso():
    rutas_sin_permiso = []
    for ruta in app.routes:
        path = getattr(ruta, "path", "")
        if not path.startswith("/api/v2/novedades-nomina/"):
            continue
        if path == "/api/v2/novedades-nomina/catalogo" or "/horas-extras" in path:
            continue
        dependencias = {
            getattr(dependencia.call, "__name__", "")
            for dependencia in getattr(ruta, "dependant", SimpleNamespace(dependencies=[])).dependencies
        }
        if "requiere_permiso_nomina_novedades" not in dependencias:
            rutas_sin_permiso.append(path)

    assert rutas_sin_permiso == []


@pytest.mark.asyncio
async def test_carga_generica_nomina_limita_lectura(monkeypatch):
    monkeypatch.setattr(nomina_router, "MAX_BYTES_ARCHIVO_NOMINA", 10, raising=False)

    with pytest.raises(HTTPException) as exc:
        await nomina_router.cargar_archivo(
            mes=6,
            año=2026,
            subcategoria="PRUEBA",
            categoria="VARIOS",
            file=_upload("prueba.txt", b"12345678901", "text/plain"),
            session=AsyncMock(),
        )

    assert exc.value.status_code == 413


@pytest.mark.parametrize(
    ("nombre", "contenido", "content_type"),
    [
        ("archivo.exe", b"MZcontenido", "application/octet-stream"),
        ("archivo.pdf", b"contenido", "application/pdf"),
        ("archivo.xlsx", b"PK\x03\x04contenido", "text/plain"),
        ("archivo.csv", b"dato\x00binario", "text/csv"),
    ],
)
def test_carga_generica_nomina_rechaza_formato_incoherente(
    nombre,
    contenido,
    content_type,
):
    with pytest.raises(HTTPException) as exc:
        nomina_router._validar_archivo_nomina(nombre, content_type, contenido)

    assert exc.value.status_code == 400


def test_ruta_nomina_debe_permanecer_en_directorio_autorizado(
    monkeypatch,
    tmp_path,
):
    almacenamiento = tmp_path / "nomina"
    almacenamiento.mkdir()
    archivo = almacenamiento / "archivo.pdf"
    archivo.write_bytes(b"%PDF")
    monkeypatch.setattr(nomina_router, "STORAGE_DIR", almacenamiento)

    assert nomina_router._resolver_ruta_nomina(str(archivo)) == Path(archivo).resolve()
    with pytest.raises(HTTPException, match="Ruta"):
        nomina_router._resolver_ruta_nomina(str(tmp_path / "fuera.pdf"))


def _upload(nombre: str | None, contenido: bytes, content_type: str) -> UploadFile:
    return UploadFile(
        filename=nombre,
        file=io.BytesIO(contenido),
        headers=Headers({"content-type": content_type}),
    )


def _xlsx_minimo() -> bytes:
    contenido = io.BytesIO()
    with ZipFile(contenido, "w") as archivo_zip:
        archivo_zip.writestr("[Content_Types].xml", "<Types />")
        archivo_zip.writestr("xl/workbook.xml", "<workbook />")
    return contenido.getvalue()


@pytest.mark.asyncio
async def test_grancoop_acepta_pdf_valido_y_conserva_nombre():
    archivos, nombres = await leer_archivos_grancoop(
        [_upload("NOMPRI_junio.pdf", b"%PDF-1.4\ncontenido", "application/pdf")]
    )

    assert archivos == [b"%PDF-1.4\ncontenido"]
    assert nombres == ["NOMPRI_junio.pdf"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("nombre", "contenido", "content_type"),
    [
        (None, b"%PDF-1.4", "application/pdf"),
        ("prima.txt", b"%PDF-1.4", "text/plain"),
        ("prima.pdf", b"no es pdf", "application/pdf"),
    ],
)
async def test_grancoop_rechaza_archivo_invalido(nombre, contenido, content_type):
    with pytest.raises(ValueError):
        await leer_archivos_grancoop([_upload(nombre, contenido, content_type)])


@pytest.mark.asyncio
async def test_beneficiar_acepta_xlsx_valido():
    contenido = _xlsx_minimo()
    archivos, nombres = await leer_archivos_beneficiar(
        [_upload("beneficiar.xlsx", contenido, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    )

    assert archivos == [contenido]
    assert nombres == ["beneficiar.xlsx"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("nombre", "contenido"),
    [
        ("beneficiar.xls", b"PK\x03\x04contenido"),
        ("beneficiar.xlsx", b"\xd0\xcf\x11\xe0contenido"),
    ],
)
async def test_beneficiar_rechaza_firma_que_no_corresponde_extension(nombre, contenido):
    with pytest.raises(ValueError, match="firma"):
        await leer_archivos_beneficiar(
            [_upload(nombre, contenido, "application/octet-stream")]
        )


@pytest.mark.asyncio
async def test_beneficiar_rechaza_zip_sin_estructura_xlsx():
    with pytest.raises(ValueError, match="ZIP|estructura"):
        await leer_archivos_beneficiar(
            [
                _upload(
                    "beneficiar.xlsx",
                    b"PK\x03\x04contenido",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            ]
        )


@pytest.mark.asyncio
async def test_cooperativa_rechaza_mas_de_cinco_archivos():
    archivos = [
        _upload(f"archivo-{indice}.pdf", b"%PDF-1.4", "application/pdf")
        for indice in range(6)
    ]

    with pytest.raises(ValueError, match="entre 1 y 5"):
        await leer_archivos_grancoop(archivos)


@pytest.mark.asyncio
async def test_cooperativa_rechaza_archivo_mayor_a_20_mb():
    contenido = b"%PDF" + b"0" * (MAX_BYTES_ARCHIVO - 3)

    with pytest.raises(ValueError, match="20 MB"):
        await leer_archivos_grancoop(
            [_upload("grancoop.pdf", contenido, "application/pdf")]
        )


@pytest.mark.asyncio
async def test_permiso_nomina_rechaza_rol_no_autorizado():
    usuario = SimpleNamespace(rol="consulta")
    with patch(
        "app.api.novedades_nomina.dependencies.ServicioAuth.obtener_permisos_por_rol",
        new=AsyncMock(return_value=[]),
    ):
        with pytest.raises(HTTPException) as exc:
            await requiere_permiso_nomina_novedades(AsyncMock(), usuario)

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_permiso_nomina_acepta_rol_autorizado():
    usuario = SimpleNamespace(rol="nomina")
    with patch(
        "app.api.novedades_nomina.dependencies.ServicioAuth.obtener_permisos_por_rol",
        new=AsyncMock(return_value=["nomina_novedades"]),
    ):
        resultado = await requiere_permiso_nomina_novedades(AsyncMock(), usuario)

    assert resultado is usuario


@pytest.mark.asyncio
async def test_preview_grancoop_requiere_autenticacion():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v2/novedades-nomina/grancoop/preview",
            data={"mes": "6", "anio": "2026"},
            files={"files": ("grancoop.pdf", b"%PDF-1.4", "application/pdf")},
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_preview_grancoop_rechaza_usuario_sin_permiso():
    async def usuario_pruebas():
        return SimpleNamespace(rol="consulta")

    async def db_pruebas():
        yield AsyncMock()

    app.dependency_overrides[obtener_usuario_actual_db] = usuario_pruebas
    app.dependency_overrides[obtener_db] = db_pruebas
    try:
        with patch(
            "app.api.novedades_nomina.dependencies.ServicioAuth.obtener_permisos_por_rol",
            new=AsyncMock(return_value=[]),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                response = await client.post(
                    "/api/v2/novedades-nomina/grancoop/preview",
                    data={"mes": "6", "anio": "2026"},
                    files={"files": ("grancoop.pdf", b"%PDF-1.4", "application/pdf")},
                )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_preview_grancoop_sanea_error_y_usa_proceso_cancelable(monkeypatch):
    monkeypatch.setattr(limiter, "enabled", False)

    async def acceso_pruebas():
        return SimpleNamespace(rol="nomina")

    async def db_pruebas():
        yield AsyncMock()

    async def erp_pruebas():
        yield None

    app.dependency_overrides[requiere_permiso_nomina_novedades] = acceso_pruebas
    app.dependency_overrides[obtener_db] = db_pruebas
    app.dependency_overrides[obtener_erp_db_opcional] = erp_pruebas
    try:
        with patch(
            "app.api.novedades_nomina.routers.cooperativas_grancoop.to_process.run_sync",
            new=AsyncMock(side_effect=ValueError("detalle interno sensible")),
        ) as ejecutar:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                response = await client.post(
                    "/api/v2/novedades-nomina/grancoop/preview",
                    data={"mes": "6", "anio": "2026"},
                    files={"files": ("grancoop.pdf", b"%PDF-1.4", "application/pdf")},
                )
    finally:
        app.dependency_overrides.clear()

    assert ejecutar.await_count == 1
    assert ejecutar.await_args.kwargs["cancellable"] is True
    assert response.status_code == 422
    assert "detalle interno sensible" not in response.text
