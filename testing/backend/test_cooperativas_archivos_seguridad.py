import io
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
import openpyxl
from fastapi import HTTPException, UploadFile
from httpx import ASGITransport, AsyncClient
from starlette.datastructures import Headers

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.api.novedades_nomina.dependencies import requiere_permiso_nomina_novedades
from app.database import obtener_db, obtener_erp_db_opcional
from app.main import app
from app.services.novedades_nomina.validacion_archivos_cooperativas import (
    MAX_BYTES_ARCHIVO,
    leer_archivos_beneficiar,
    leer_archivos_grancoop,
)


def _upload(nombre: str | None, contenido: bytes, content_type: str) -> UploadFile:
    return UploadFile(
        filename=nombre,
        file=io.BytesIO(contenido),
        headers=Headers({"content-type": content_type}),
    )


def _xlsx_valido() -> bytes:
    workbook = openpyxl.Workbook()
    workbook.active.append(["CEDULA", "VALOR"])
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


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
    contenido = _xlsx_valido()
    archivos = await leer_archivos_beneficiar(
        [_upload("beneficiar.xlsx", contenido, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    )

    assert archivos == [contenido]


@pytest.mark.asyncio
async def test_beneficiar_rechaza_zip_que_no_es_xlsx():
    with pytest.raises(ValueError, match="libro Excel|corrupto"):
        await leer_archivos_beneficiar([
            _upload(
                "beneficiar.xlsx",
                b"PK\x03\x04contenido",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        ])


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
async def test_beneficiar_rechaza_expansion_agregada(monkeypatch):
    from app.services.novedades_nomina import validacion_archivos_cooperativas as modulo

    monkeypatch.setattr(modulo, "MAX_BYTES_EXPANDIDOS_TOTAL", 100)
    monkeypatch.setattr(modulo, "validar_contenido_nomina", lambda *_args: 60)
    archivos = [
        _upload(
            f"beneficiar-{indice}.xlsx",
            b"PK\x03\x04contenido",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        for indice in range(2)
    ]

    with pytest.raises(ValueError, match="expandida"):
        await leer_archivos_beneficiar(archivos)


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
async def test_preview_grancoop_sanea_error_y_usa_proceso_cancelable():
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
