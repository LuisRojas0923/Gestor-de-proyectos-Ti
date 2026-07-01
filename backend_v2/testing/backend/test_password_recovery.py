import pytest
import httpx
from unittest.mock import patch
from app.services.auth.servicio import ServicioAuth
from app.models.auth.usuario import Usuario
from sqlalchemy import text
from app.main import app
from app.database import obtener_db


@pytest.fixture
async def fast_client(db_session):
    """Cliente ASGI local con inyección de dependencia para la DB de prueba"""
    async def _get_db_override():
        yield db_session

    app.dependency_overrides[obtener_db] = _get_db_override
    async with httpx.AsyncClient(app=app, base_url="http://testserver/api/v2") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_forgot_password_success(fast_client, db_session):
    """Test: solicitud de recuperación de contraseña envía correo."""
    cedula = "111222333"
    usuario_id = f"USR-{cedula}"
    email = "test@refridcol.com"

    await db_session.execute(text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id})
    await db_session.commit()

    usuario = Usuario(
        id=usuario_id, cedula=cedula, nombre="Usuario Test Recovery",
        correo=email, correo_actualizado=True, rol="admin",
        esta_activo=True,
        hash_contrasena=ServicioAuth.obtener_hash_contrasena("password123")
    )
    db_session.add(usuario)
    await db_session.commit()

    with patch("app.api.auth.login_router.EmailService.enviar_recuperacion_contrasena") as mock_send:
        mock_send.return_value = True
        response = await fast_client.post("/auth/forgot-password", json={"cedula": cedula})

        assert response.status_code == 200
        assert "instrucciones para restablecer su contraseña" in response.json()["message"]
        mock_send.assert_called_once()


@pytest.mark.asyncio
async def test_reset_password_success(fast_client, db_session):
    """Test: token válido permite cambiar contraseña."""
    cedula = "444555666"
    usuario_id = f"USR-{cedula}"

    await db_session.execute(text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id})
    await db_session.commit()

    usuario = Usuario(
        id=usuario_id, cedula=cedula, nombre="Usuario Reset Test",
        rol="admin", esta_activo=True,
        hash_contrasena=ServicioAuth.obtener_hash_contrasena("old_password")
    )
    db_session.add(usuario)
    await db_session.commit()

    token = ServicioAuth.crear_token_recuperacion(usuario_id)
    nueva_clave = "NuevaClaveSuperSegura123!"

    response = await fast_client.post("/auth/reset-password", json={
        "token": token, "nueva_contrasena": nueva_clave
    })

    assert response.status_code == 200
    assert "Contraseña restablecida exitosamente" in response.json()["message"]

    await db_session.refresh(usuario)
    assert ServicioAuth.verificar_contrasena(nueva_clave, usuario.hash_contrasena)


@pytest.mark.asyncio
async def test_reset_password_invalid_token(fast_client):
    """Test: token inválido es rechazado con 400."""
    response = await fast_client.post("/auth/reset-password", json={
        "token": "token_totalmente_invalido",
        "nueva_contrasena": "clave123456"
    })

    assert response.status_code == 400
    assert "Token de recuperación inválido o expirado" in response.json()["detail"]
