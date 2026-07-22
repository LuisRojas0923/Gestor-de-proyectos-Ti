"""Contrato HTTP aislado para notificaciones privadas."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import delete, select

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.api.notificaciones.router import router
from app.database import obtener_db
from app.models.alerta.notificacion import NotificacionUsuario
from app.models.auth.usuario import Usuario
from app.services.notificacion.servicio import ServicioNotificacion


def _usuario() -> Usuario:
    return Usuario(
        id="USR-A",
        cedula="1001",
        nombre="Usuario A",
        hash_contrasena="hash",
        rol="usuario",
    )


@pytest.fixture
def app_notificaciones():
    app = FastAPI()
    db = SimpleNamespace(commit=AsyncMock(), refresh=AsyncMock())

    async def usuario_actual():
        return _usuario()

    async def db_actual():
        yield db

    app.include_router(router, prefix="/notificaciones")
    app.dependency_overrides[obtener_usuario_actual_db] = usuario_actual
    app.dependency_overrides[obtener_db] = db_actual
    return app, db


@pytest.mark.asyncio
async def test_listado_solo_usa_identidad_autenticada(app_notificaciones, monkeypatch):
    app, db = app_notificaciones
    listar = AsyncMock(return_value=[])
    monkeypatch.setattr(
        ServicioNotificacion,
        "listar_notificaciones_usuario",
        listar,
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        respuesta = await client.get("/notificaciones/mias")

    assert respuesta.status_code == 200
    listar.assert_awaited_once_with(db, "USR-A", limit=50)


@pytest.mark.asyncio
async def test_notificacion_ajena_responde_404_sin_confirmar(
    app_notificaciones, monkeypatch
):
    app, db = app_notificaciones
    actualizar = AsyncMock(return_value=None)
    monkeypatch.setattr(
        ServicioNotificacion,
        "actualizar_estado_leido_propio",
        actualizar,
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        respuesta = await client.put(
            "/notificaciones/mias/9/leido",
            json={"leido": True},
        )

    assert respuesta.status_code == 404
    actualizar.assert_awaited_once_with(
        db,
        notificacion_id=9,
        usuario_id="USR-A",
        leido=True,
    )
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_propietario_marca_notificacion_y_confirma(
    app_notificaciones, monkeypatch
):
    app, db = app_notificaciones
    notificacion = NotificacionUsuario(
        id=7,
        usuario_id="USR-A",
        titulo="PDF disponible",
        mensaje="La bitacora esta lista",
        tipo_evento="bitacora_finalizada",
        referencia_id="BIT-1",
        leido=True,
    )
    monkeypatch.setattr(
        ServicioNotificacion,
        "actualizar_estado_leido_propio",
        AsyncMock(return_value=notificacion),
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        respuesta = await client.put(
            "/notificaciones/mias/7/leido",
            json={"leido": True},
        )

    assert respuesta.status_code == 200
    assert respuesta.json()["usuario_id"] == "USR-A"
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(notificacion)


@pytest.mark.asyncio
async def test_no_existe_creacion_publica_de_notificaciones(app_notificaciones):
    app, _db = app_notificaciones

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        respuesta = await client.post(
            "/notificaciones/",
            json={"usuario_id": "OTRO-USUARIO"},
        )

    assert respuesta.status_code in {404, 405}


@pytest.mark.asyncio
@pytest.mark.mutating_integration
async def test_persistencia_impide_actualizar_notificacion_ajena(db_session):
    usuario_id = (await db_session.execute(
        select(Usuario.id).where(Usuario.cedula == "admin_test")
    )).scalar_one()
    notificacion = NotificacionUsuario(
        usuario_id=usuario_id,
        titulo="Notificacion sintetica",
        mensaje="Prueba de aislamiento",
        tipo_evento="prueba",
        referencia_id="TEST-NOTIFICACION-AJENA",
        leido=False,
    )
    db_session.add(notificacion)
    await db_session.commit()
    await db_session.refresh(notificacion)

    try:
        resultado = await ServicioNotificacion.actualizar_estado_leido_propio(
            db_session,
            notificacion_id=notificacion.id,
            usuario_id="USUARIO-AJENO",
            leido=True,
        )
        await db_session.refresh(notificacion)

        assert resultado is None
        assert notificacion.leido is False
    finally:
        await db_session.execute(
            delete(NotificacionUsuario).where(NotificacionUsuario.id == notificacion.id)
        )
        await db_session.commit()
