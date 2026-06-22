"""Pruebas P1 para revocacion efectiva de JWT web."""

from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.auth.refresh_router import refrescar_token
from app.api.auth.profile_router import obtener_usuario_actual_db
from app.main import app
from app.models.auth.usuario import Sesion, Usuario
from app.services.auth.servicio import ServicioAuth
from app.utils_date import get_bogota_now


async def _crear_usuario(db, *, activo: bool = True) -> Usuario:
    suffix = uuid4().hex[:12]
    usuario = Usuario(
        id=f"USR-SEC-{suffix}",
        cedula=f"SEC-{suffix}",
        nombre="Usuario Seguridad",
        hash_contrasena="hash-no-usado-en-test",
        rol="usuario",
        esta_activo=activo,
    )
    db.add(usuario)
    await db.commit()
    return usuario


async def _crear_token_y_sesion(db, usuario: Usuario, *, revocada: bool = False) -> str:
    jti = str(uuid4())
    token = ServicioAuth.crear_token_acceso(
        datos={"sub": usuario.cedula, "rol": usuario.rol},
        jti=jti,
    )
    ahora = get_bogota_now()
    sesion = Sesion(
        usuario_id=usuario.id,
        token_sesion=token,
        nombre_usuario=usuario.nombre,
        rol_usuario=usuario.rol,
        expira_en=ahora + timedelta(minutes=30),
        fin_sesion=ahora if revocada else None,
        tipo_sesion="web",
        jti=jti,
    )
    db.add(sesion)
    await db.commit()
    return token


async def _crear_token_mcp_y_sesion(db, usuario: Usuario, *, revocada: bool = False) -> str:
    jti = str(uuid4())
    token = ServicioAuth.crear_token_acceso(
        datos={"sub": usuario.cedula, "rol": usuario.rol, "scope": "read"},
        jti=jti,
        tipo_token="mcp",
    )
    ahora = get_bogota_now()
    sesion = Sesion(
        usuario_id=usuario.id,
        token_sesion=token,
        nombre_usuario=usuario.nombre,
        rol_usuario=usuario.rol,
        expira_en=ahora + timedelta(minutes=30),
        fin_sesion=ahora if revocada else None,
        tipo_sesion="mcp",
        jti=jti,
        scope="read",
    )
    db.add(sesion)
    await db.commit()
    return token


def _request_fake():
    return SimpleNamespace(state=SimpleNamespace(), headers={}, client=None)


@pytest.mark.asyncio
async def test_obtener_usuario_actual_rechaza_sesion_web_revocada(db_session):
    usuario = await _crear_usuario(db_session)
    token = await _crear_token_y_sesion(db_session, usuario, revocada=True)

    with pytest.raises(HTTPException) as exc:
        await obtener_usuario_actual_db(_request_fake(), token, db_session, None)

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_obtener_usuario_actual_rechaza_token_web_sin_sesion(db_session):
    usuario = await _crear_usuario(db_session)
    token = ServicioAuth.crear_token_acceso(datos={"sub": usuario.cedula, "rol": usuario.rol})

    with pytest.raises(HTTPException) as exc:
        await obtener_usuario_actual_db(_request_fake(), token, db_session, None)

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_obtener_usuario_actual_rechaza_usuario_inactivo(db_session):
    usuario = await _crear_usuario(db_session, activo=False)
    token = await _crear_token_y_sesion(db_session, usuario)

    with pytest.raises(HTTPException) as exc:
        await obtener_usuario_actual_db(_request_fake(), token, db_session, None)

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_no_reemite_token_revocado(db_session):
    usuario = await _crear_usuario(db_session)
    token = await _crear_token_y_sesion(db_session, usuario, revocada=True)

    with pytest.raises(HTTPException) as exc:
        await refrescar_token.__wrapped__(_request_fake(), token, db_session)

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_middleware_global_rechaza_token_web_revocado(db_session):
    usuario = await _crear_usuario(db_session)
    token = await _crear_token_y_sesion(db_session, usuario, revocada=True)
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get(
        "/api/v2/erp/solicitudes",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_middleware_global_no_rechaza_token_mcp_activo(db_session):
    usuario = await _crear_usuario(db_session)
    token = await _crear_token_mcp_y_sesion(db_session, usuario)
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get(
        "/api/v2/erp/solicitudes",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code != 401


@pytest.mark.asyncio
async def test_middleware_global_rechaza_token_mcp_revocado(db_session):
    usuario = await _crear_usuario(db_session)
    token = await _crear_token_mcp_y_sesion(db_session, usuario, revocada=True)
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get(
        "/api/v2/erp/solicitudes",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
