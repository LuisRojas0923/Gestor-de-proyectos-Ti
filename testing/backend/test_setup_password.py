"""
Suite de Pruebas: Configuración de Contraseña (setup-password) y Estado

Cubre los nuevos endpoints que reemplazan portal-login:
  1. GET /auth/password-status/{cedula} — verificar si usuario tiene contraseña configurada
  2. POST /auth/setup-password — configurar contraseña por primera vez
  3. GET /auth/login — rechazo con 400 PASSWORD_NOT_SET cuando password_set=False
"""

import pytest
import os
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlmodel import select
from dotenv import load_dotenv

from app.models.auth.usuario import Usuario, Sesion
from app.services.auth.servicio import ServicioAuth

load_dotenv()

_CEDULA_SETUP = "999000111"
_ID_SETUP = f"USR-P-{_CEDULA_SETUP}"
_TEST_PASSWORD = "MiClaveSegura2026!"

# ---------------------------------------------------------------------------
# Fixture: usuario con password sin configurar (hash = cedula)
# ---------------------------------------------------------------------------

@pytest.fixture
async def usuario_pendiente(db_session):
    """Crea un usuario con hash de cedula (password_set=False)."""
    await db_session.execute(
        text("DELETE FROM sesiones WHERE usuario_id = :id"),
        {"id": _ID_SETUP}
    )
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"),
        {"id": _ID_SETUP}
    )
    await db_session.commit()

    hash_pendiente = ServicioAuth.obtener_hash_contrasena(_CEDULA_SETUP)
    usuario = Usuario(
        id=_ID_SETUP,
        cedula=_CEDULA_SETUP,
        nombre="Usuario Test Setup Password",
        hash_contrasena=hash_pendiente,
        rol="usuario",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()
    await db_session.refresh(usuario)

    yield usuario

    await db_session.execute(
        text("DELETE FROM sesiones WHERE usuario_id = :id"),
        {"id": _ID_SETUP}
    )
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"),
        {"id": _ID_SETUP}
    )
    await db_session.commit()


# ---------------------------------------------------------------------------
# Test 1: GET /auth/password-status — usuario sin configurar
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_password_status_no_configurado(client, usuario_pendiente):
    """Verifica que password-status retorne configurado=False para usuario pendiente."""
    response = await client.get(f"/auth/password-status/{_CEDULA_SETUP}")
    assert response.status_code == 200
    data = response.json()
    assert data["configurado"] is False
    assert data["existe"] is True


@pytest.mark.asyncio
async def test_password_status_usuario_inexistente(client):
    """Verifica que password-status retorne existe=False para cedula desconocida."""
    response = await client.get("/auth/password-status/000000000")
    assert response.status_code == 200
    data = response.json()
    assert data["configurado"] is False
    assert data["existe"] is False


# ---------------------------------------------------------------------------
# Test 2: POST /auth/setup-password — primera configuración exitosa
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_setup_password_exitoso(client, usuario_pendiente, db_session):
    """Verifica que setup-password configure la contraseña correctamente."""
    response = await client.post("/auth/setup-password", json={
        "cedula": _CEDULA_SETUP,
        "contrasena": _TEST_PASSWORD
    })
    assert response.status_code == 200
    data = response.json()
    assert data["cedula"] == _CEDULA_SETUP

    # Verificar que el hash cambió en DB
    await db_session.refresh(usuario_pendiente)
    assert ServicioAuth.es_password_configurado(usuario_pendiente.hash_contrasena, _CEDULA_SETUP) is True
    assert ServicioAuth.verificar_contrasena(_TEST_PASSWORD, usuario_pendiente.hash_contrasena)


@pytest.mark.asyncio
async def test_setup_password_rechaza_si_ya_configurado(client, usuario_pendiente, db_session):
    """Verifica que setup-password rechace si el usuario ya tiene contraseña configurada."""
    # Primero configurar
    await client.post("/auth/setup-password", json={
        "cedula": _CEDULA_SETUP,
        "contrasena": _TEST_PASSWORD
    })

    # Segundo intento debe fallar
    response = await client.post("/auth/setup-password", json={
        "cedula": _CEDULA_SETUP,
        "contrasena": "OtraClave2026!"
    })
    assert response.status_code == 400
    assert "ya tiene una contraseña configurada" in response.json()["detail"]


@pytest.mark.asyncio
async def test_setup_password_rechaza_contrasena_igual_a_cedula(client, usuario_pendiente, db_session):
    """Verifica que setup-password rechace si la contraseña es igual a la cédula (caso del ciclo infinito)."""
    response = await client.post("/auth/setup-password", json={
        "cedula": _CEDULA_SETUP,
        "contrasena": _CEDULA_SETUP
    })
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "no puede ser igual a la cédula" in detail

    # Verificar que el hash NO fue actualizado (sigue siendo pendiente)
    result = await db_session.execute(
        text("SELECT hash_contrasena FROM usuarios WHERE id = :id"),
        {"id": _ID_SETUP}
    )
    hash_actual = result.scalar_one()
    assert ServicioAuth.es_password_configurado(hash_actual, _CEDULA_SETUP) is False


# ---------------------------------------------------------------------------
# Test 3: POST /auth/login — rechazo con 400 cuando password_set=False
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_rechaza_password_no_configurado(client, usuario_pendiente):
    """Verifica que /auth/login devuelva 400 PASSWORD_NOT_SET cuando password_set=False."""
    response = await client.post("/auth/login", data={
        "username": _CEDULA_SETUP,
        "password": _CEDULA_SETUP
    })
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "Contraseña no configurada"


@pytest.mark.asyncio
async def test_login_exitoso_tras_setup(client, usuario_pendiente, db_session):
    """Verifica que tras setup-password, el login funcione normalmente."""
    # Configurar contraseña
    await client.post("/auth/setup-password", json={
        "cedula": _CEDULA_SETUP,
        "contrasena": _TEST_PASSWORD
    })

    # Login debe funcionar
    response = await client.post("/auth/login", data={
        "username": _CEDULA_SETUP,
        "password": _TEST_PASSWORD
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["password_set"] is True
    assert data["user"]["cedula"] == _CEDULA_SETUP
