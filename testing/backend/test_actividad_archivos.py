"""Pruebas de almacenamiento seguro para evidencias de actividades WBS."""

from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI, HTTPException, Request, UploadFile
from starlette.datastructures import Headers

from app.models.desarrollo.actividad import ActividadActualizar, ActividadCrear
from app.services.desarrollos.actividad_archivo_service import (
    ArchivoActividadInvalido,
    eliminar_archivo_interno,
    guardar_archivo_actividad,
    resolver_archivo_actividad,
)


def crear_upload(nombre: str, contenido: bytes, tipo_mime: str) -> UploadFile:
    return UploadFile(
        filename=nombre,
        file=BytesIO(contenido),
        headers=Headers({"content-type": tipo_mime}),
    )


@pytest.mark.asyncio
async def test_guarda_pdf_y_lo_resuelve_dentro_de_la_actividad(tmp_path):
    archivo = crear_upload("Evidencia final.pdf", b"%PDF-1.7\ncontenido", "application/pdf")

    guardado = await guardar_archivo_actividad(
        actividad_id=42,
        archivo=archivo,
        almacenamiento_raiz=tmp_path,
        maximo_bytes=1024,
    )

    assert guardado.ruta_relativa.startswith("actividades/42/")
    assert guardado.nombre_descarga == "Evidencia final.pdf"
    assert guardado.tamano_bytes == len(b"%PDF-1.7\ncontenido")
    ruta, nombre, tipo_mime = resolver_archivo_actividad(
        42, guardado.ruta_relativa, tmp_path
    )
    assert ruta.read_bytes() == b"%PDF-1.7\ncontenido"
    assert nombre == "Evidencia final.pdf"
    assert tipo_mime == "application/pdf"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("nombre", "contenido", "tipo_mime", "maximo_bytes"),
    [
        ("evidencia.exe", b"MZcontenido", "application/octet-stream", 1024),
        ("evidencia.pdf", b"no es pdf", "application/pdf", 1024),
        ("evidencia.pdf", b"%PDF-1.7\ncontenido", "application/pdf", 8),
    ],
)
async def test_rechaza_tipo_firma_o_tamano_invalido(
    tmp_path, nombre, contenido, tipo_mime, maximo_bytes
):
    archivo = crear_upload(nombre, contenido, tipo_mime)

    with pytest.raises(ArchivoActividadInvalido):
        await guardar_archivo_actividad(
            actividad_id=7,
            archivo=archivo,
            almacenamiento_raiz=tmp_path,
            maximo_bytes=maximo_bytes,
        )

    assert not list(tmp_path.rglob("*.*"))


@pytest.mark.asyncio
async def test_impide_resolver_archivo_de_otra_actividad(tmp_path):
    archivo = crear_upload("evidencia.pdf", b"%PDF-1.7\ncontenido", "application/pdf")
    guardado = await guardar_archivo_actividad(7, archivo, tmp_path, 1024)

    with pytest.raises(ArchivoActividadInvalido):
        resolver_archivo_actividad(8, guardado.ruta_relativa, tmp_path)

    assert eliminar_archivo_interno(8, guardado.ruta_relativa, tmp_path) is False
    assert resolver_archivo_actividad(7, guardado.ruta_relativa, tmp_path)[0].exists()

    ruta_manipulada = f"actividades/7/{'a' * 32}_../8/archivo.pdf"
    with pytest.raises(ArchivoActividadInvalido):
        resolver_archivo_actividad(7, ruta_manipulada, tmp_path)


def test_json_normal_no_permite_asignar_archivo_url():
    crear = ActividadCrear(
        desarrollo_id="DEV-1",
        titulo="Tarea",
        archivo_url="actividades/99/archivo-ajeno.pdf",
    )
    actualizar = ActividadActualizar(
        archivo_url="https://sitio-no-validado.example/evidencia"
    )

    assert "archivo_url" not in crear.model_dump()
    assert "archivo_url" not in actualizar.model_dump(exclude_unset=True)


def test_descarga_de_actividad_esta_registrada_para_auditoria():
    from app.core.middleware.auditoria_rutas import (
        es_ruta_descarga_auditable,
        inferir_entidad_descarga,
    )

    ruta = "/api/v2/actividades/42/archivo"
    assert es_ruta_descarga_auditable(ruta) is True
    assert inferir_entidad_descarga(ruta) == ("archivo_actividad", "42")


@pytest.mark.asyncio
async def test_middleware_rechaza_body_antes_del_parser():
    from app.core.middleware.limite_carga_actividad import LimiteCargaActividadMiddleware

    app = FastAPI()
    app.add_middleware(LimiteCargaActividadMiddleware, max_body_size=10)

    @app.post("/api/v2/actividades/{actividad_id}/archivo")
    async def recibir(actividad_id: int, request: Request):
        await request.body()
        return {"actividad_id": actividad_id}

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v2/actividades/42/archivo",
            content=b"contenido demasiado largo",
        )

    assert response.status_code == 413

    async def contenido_chunked():
        yield b"123456"
        yield b"789012"

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response_chunked = await client.post(
            "/api/v2/actividades/+42/archivo",
            content=contenido_chunked(),
        )

    assert response_chunked.status_code == 413


@pytest.mark.asyncio
async def test_endpoints_http_cubren_carga_descarga_y_eliminacion(tmp_path, monkeypatch):
    from app.api.desarrollos import actividad_archivos_router as modulo
    from app.core.middleware.limite_carga_actividad import LimiteCargaActividadMiddleware
    from app.core.rate_limiter import limiter
    from app.database import obtener_db
    from app.services.desarrollos import actividad_access_service as modulo_acceso

    actividad = SimpleNamespace(
        id=42,
        anulada=False,
        archivo_url=None,
        responsable_id="USR-SUPERVISOR",
        asignado_a_id="USR-1",
        delegado_por_id="USR-CREADOR",
        desarrollo_id="DEV-1",
    )

    class Resultado:
        def scalar_one_or_none(self):
            return actividad

    class DbFalsa:
        def __init__(self):
            self.rollbacks = 0

        async def execute(self, _consulta):
            return Resultado()

        async def commit(self):
            return None

        async def rollback(self):
            self.rollbacks += 1

    usuario = SimpleNamespace(id="USR-1", rol="analista", nombre="Prueba")
    db = DbFalsa()
    monkeypatch.setattr(modulo.config, "storage_path", str(tmp_path))
    monkeypatch.setattr(modulo.config, "storage_max_size_mb", 1)
    monkeypatch.setattr(
        modulo_acceso.JerarquiaService,
        "obtener_ids_y_nombres_subordinados",
        AsyncMock(return_value={"ids": [], "nombres": []}),
    )
    monkeypatch.setattr(modulo, "usuario_puede_acceder_actividad", AsyncMock(return_value=True))
    monkeypatch.setattr(limiter, "enabled", False)

    app = FastAPI()
    app.add_middleware(LimiteCargaActividadMiddleware, max_body_size=(1024 * 1024) + 65536)
    app.include_router(modulo.router, prefix="/api/v2/actividades")
    app.dependency_overrides[obtener_db] = lambda: db
    app.dependency_overrides[modulo.requiere_permiso_desarrollos] = lambda: usuario

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        boundary = "limite-prueba"

        async def multipart_sin_longitud():
            yield (
                f"--{boundary}\r\n"
                'Content-Disposition: form-data; name="archivo"; filename="grande.pdf"\r\n'
                "Content-Type: application/pdf\r\n\r\n"
            ).encode()
            yield b"%PDF-1.7\n" + (b"x" * ((1024 * 1024) + 70000))
            yield f"\r\n--{boundary}--\r\n".encode()

        excedida = await client.post(
            "/api/v2/actividades/+42/archivo",
            headers={"content-type": f"multipart/form-data; boundary={boundary}"},
            content=multipart_sin_longitud(),
        )
        assert excedida.status_code == 413
        rollbacks_antes_subida = db.rollbacks

        subida = await client.post(
            "/api/v2/actividades/42/archivo",
            files={"archivo": ("informe.pdf", b"%PDF-1.7\ncontenido", "application/pdf")},
        )
        assert subida.status_code == 200
        assert actividad.archivo_url.startswith("actividades/42/")
        assert db.rollbacks == rollbacks_antes_subida + 1

        descarga = await client.get("/api/v2/actividades/42/archivo")
        assert descarga.status_code == 200
        assert descarga.content == b"%PDF-1.7\ncontenido"
        assert descarga.headers["x-content-type-options"] == "nosniff"

        eliminacion = await client.delete("/api/v2/actividades/42/archivo")
        assert eliminacion.status_code == 204
        assert actividad.archivo_url is None


@pytest.mark.asyncio
async def test_rbac_rechaza_rol_sin_permiso(monkeypatch):
    from app.api.desarrollos import actividad_archivos_router as modulo

    monkeypatch.setattr(
        modulo.ServicioAuth,
        "obtener_permisos_por_rol",
        AsyncMock(return_value=[]),
    )
    usuario = SimpleNamespace(rol="sin-acceso")

    with pytest.raises(HTTPException) as exc_info:
        await modulo.requiere_permiso_desarrollos(SimpleNamespace(), usuario)

    assert exc_info.value.status_code == 403
