"""
Suite de Pruebas: Seguridad de Escalado de Roles y Cambio Forzado de Contraseña

Cubre el flujo completo introducido en el commit de autenticación escalonada:
  1. Detección de password_set=False para usuarios JIT del portal
  2. Escalado de rol (no-admin → admin) dispara reseteo de seguridad
  3. Invalidación de sesiones activas al escalar
  4. Cambio forzado de contraseña via PATCH /auth/password
  5. Verificación de que /auth/yo refleja el estado correcto tras el cambio
"""

import pytest
import os
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlmodel import select
from dotenv import load_dotenv

from app.models.auth.usuario import Usuario, Sesion
from app.services.auth.servicio import ServicioAuth
from app.config import config

load_dotenv()

TEST_ADMIN_CEDULA = os.getenv("TEST_ADMIN_CEDULA", os.getenv("TEST_USER_CEDULA", "1107068093"))
TEST_ADMIN_PASS = os.getenv("TEST_ADMIN_PASS", os.getenv("TEST_USER_PASS", "1107068093"))

# Datos del usuario de prueba para escalado
_CEDULA_ESCALADO = "777000111"
_ID_ESCALADO = f"USR-{_CEDULA_ESCALADO}"


# ---------------------------------------------------------------------------
# Fixture: token de administrador
# ---------------------------------------------------------------------------

@pytest.fixture
async def admin_token(client):
    """Token de un usuario con rol admin para operaciones administrativas."""
    response = await client.post("/auth/login", data={
        "username": TEST_ADMIN_CEDULA,
        "password": TEST_ADMIN_PASS
    })
    if response.status_code == 200:
        data = response.json()
        if data.get("user", {}).get("role") == "admin":
            return data["access_token"]
    return None


# ---------------------------------------------------------------------------
# Fixture: usuario de prueba para escalado (se limpia antes y después)
# ---------------------------------------------------------------------------

@pytest.fixture
async def usuario_escalado(db_session):
    """
    Crea un usuario con rol 'analyst' y hash de contraseña conocida.
    Se limpia automáticamente al finalizar el test.
    """
    # Limpiar si existe de ejecuciones anteriores
    await db_session.execute(
        text("DELETE FROM sesiones WHERE usuario_id = :id"),
        {"id": _ID_ESCALADO}
    )
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"),
        {"id": _ID_ESCALADO}
    )
    await db_session.commit()

    usuario = Usuario(
        id=_ID_ESCALADO,
        cedula=_CEDULA_ESCALADO,
        nombre="Usuario Test Escalado",
        hash_contrasena=ServicioAuth.obtener_hash_contrasena("clave_inicial"),
        rol="analyst",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()
    await db_session.refresh(usuario)

    yield usuario

    # Teardown
    await db_session.execute(
        text("DELETE FROM sesiones WHERE usuario_id = :id"),
        {"id": _ID_ESCALADO}
    )
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"),
        {"id": _ID_ESCALADO}
    )
    await db_session.commit()


# ---------------------------------------------------------------------------
# Test 1: Detección de password_set=False en usuario JIT
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_password_set_false_para_usuario_portal_pending(db_session):
    """
    Verifica que es_password_configurado() devuelva False cuando el hash
    corresponde a la clave genérica de portal (portal_pending_pwd).
    """
    hash_pendiente = ServicioAuth.obtener_hash_contrasena(config.portal_pending_pwd)
    assert ServicioAuth.es_password_configurado(hash_pendiente) is False


@pytest.mark.asyncio
async def test_password_set_false_cuando_hash_es_cedula():
    """
    Verifica que es_password_configurado() devuelva False cuando el hash
    corresponde a la propia cédula del usuario (caso post-escalado).
    """
    cedula = "123456789"
    hash_cedula = ServicioAuth.obtener_hash_contrasena(cedula)
    assert ServicioAuth.es_password_configurado(hash_cedula, cedula) is False


@pytest.mark.asyncio
async def test_password_set_true_para_clave_personalizada():
    """
    Verifica que es_password_configurado() devuelva True cuando el usuario
    ya estableció una clave personal.
    """
    cedula = "123456789"
    hash_personal = ServicioAuth.obtener_hash_contrasena("MiClaveSegura123!")
    assert ServicioAuth.es_password_configurado(hash_personal, cedula) is True


# ---------------------------------------------------------------------------
# Test 2: Invalidación de sesiones
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invalidar_sesiones_cierra_sesiones_activas(db_session, usuario_escalado):
    """
    Verifica que invalidar_sesiones_usuario() marque fin_sesion en todas
    las sesiones activas del usuario.
    """
    # Crear 2 sesiones activas (sin fin_sesion)
    sesiones = [
        Sesion(
            usuario_id=_ID_ESCALADO,
            token_sesion=f"token-test-{i}",
            expira_en=datetime.now() + timedelta(hours=1)
        )
        for i in range(2)
    ]
    for s in sesiones:
        db_session.add(s)
    await db_session.commit()

    # Invalidar
    count = await ServicioAuth.invalidar_sesiones_usuario(db_session, _ID_ESCALADO)
    assert count == 2

    # Verificar que no quedan activas
    stmt = select(Sesion).where(
        Sesion.usuario_id == _ID_ESCALADO,
        Sesion.fin_sesion.is_(None)
    )
    result = await db_session.execute(stmt)
    activas = result.scalars().all()
    assert len(activas) == 0


@pytest.mark.asyncio
async def test_invalidar_sesiones_idempotente(db_session, usuario_escalado):
    """
    Verifica que llamar a invalidar_sesiones_usuario() dos veces no genere
    errores y que la segunda llamada devuelva 0 (nada que invalidar).
    """
    sesion = Sesion(
        usuario_id=_ID_ESCALADO,
        token_sesion="token-idempotente",
        expira_en=datetime.now() + timedelta(hours=1)
    )
    db_session.add(sesion)
    await db_session.commit()

    primera = await ServicioAuth.invalidar_sesiones_usuario(db_session, _ID_ESCALADO)
    segunda = await ServicioAuth.invalidar_sesiones_usuario(db_session, _ID_ESCALADO)

    assert primera == 1
    assert segunda == 0


# ---------------------------------------------------------------------------
# Test 3: Flujo de escalado vía API (requiere admin)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_escalado_rol_via_api_resetea_password(client, admin_token, usuario_escalado, db_session):
    """
    PRUEBA DE ORO: Verifica el flujo completo de escalado.

    Al escalar un usuario de 'analyst' a 'admin' vía PATCH /auth/analistas/:id:
      - El hash de contraseña debe cambiar a la cédula del usuario
      - password_set debe ser False en /auth/yo
    """
    if not admin_token:
        pytest.skip("No hay token admin disponible. Verificar TEST_ADMIN_CEDULA/TEST_ADMIN_PASS.")

    headers = {"Authorization": f"Bearer {admin_token}"}

    response = await client.patch(
        f"/auth/analistas/{_ID_ESCALADO}",
        json={"rol": "admin"},
        headers=headers
    )

    # Puede ser 200 o 403 si el rol 'admin' no tiene módulos admin configurados en RBAC
    if response.status_code == 403:
        pytest.skip("RBAC no tiene módulos admin configurados en este entorno.")

    assert response.status_code == 200, f"Escalado falló: {response.text}"

    # Verificar en DB que el hash cambió a la cédula
    await db_session.refresh(usuario_escalado)
    assert ServicioAuth.verificar_contrasena(_CEDULA_ESCALADO, usuario_escalado.hash_contrasena), \
        "El hash no fue reseteado a la cédula del usuario tras el escalado."

    assert ServicioAuth.es_password_configurado(usuario_escalado.hash_contrasena, _CEDULA_ESCALADO) is False


@pytest.mark.asyncio
async def test_escalado_mismo_rol_no_resetea_password(client, admin_token, usuario_escalado, db_session):
    """
    Verifica que actualizar un usuario sin cambiar a un rol admin
    NO dispara el reseteo de seguridad.
    """
    if not admin_token:
        pytest.skip("No hay token admin disponible.")

    headers = {"Authorization": f"Bearer {admin_token}"}
    hash_original = usuario_escalado.hash_contrasena

    # Actualizar solo especialidades (sin cambiar rol)
    response = await client.patch(
        f"/auth/analistas/{_ID_ESCALADO}",
        json={"especialidades": ["redes"]},
        headers=headers
    )

    assert response.status_code == 200, f"Update falló: {response.text}"

    await db_session.refresh(usuario_escalado)
    assert usuario_escalado.hash_contrasena == hash_original, \
        "El hash fue modificado sin justificación de seguridad."


# ---------------------------------------------------------------------------
# Test 4: Cambio forzado de contraseña vía API
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cambio_forzado_password_exitoso(client, db_session):
    """
    Verifica que PATCH /auth/password permita a un usuario cambiar su clave
    cuando la clave actual es válida.
    """
    cedula = "888000222"
    usuario_id = f"USR-{cedula}"
    clave_actual = cedula

    # Setup: usuario con hash = cédula (post-escalado)
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()

    usuario = Usuario(
        id=usuario_id,
        cedula=cedula,
        nombre="Test Cambio Password",
        hash_contrasena=ServicioAuth.obtener_hash_contrasena(clave_actual),
        rol="admin",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()

    # Login para obtener token
    login_res = await client.post("/auth/login", data={
        "username": cedula,
        "password": clave_actual
    })
    assert login_res.status_code == 200, f"Login falló: {login_res.text}"
    token = login_res.json()["access_token"]

    # Cambiar contraseña
    response = await client.patch(
        "/auth/password",
        json={
            "contrasena_actual": clave_actual,
            "nueva_contrasena": "NuevaClaveSegura99!"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, f"Cambio de password falló: {response.text}"

    # Verificar que el nuevo hash ya no es la cédula
    await db_session.refresh(usuario)
    assert ServicioAuth.es_password_configurado(usuario.hash_contrasena, cedula) is True
    assert ServicioAuth.verificar_contrasena("NuevaClaveSegura99!", usuario.hash_contrasena)

    # Teardown
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_cambio_password_rechaza_clave_actual_incorrecta(client, db_session):
    """
    Verifica que PATCH /auth/password devuelva 400 si la clave actual es incorrecta.
    """
    cedula = "888000333"
    usuario_id = f"USR-{cedula}"

    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()

    usuario = Usuario(
        id=usuario_id,
        cedula=cedula,
        nombre="Test Password Incorrecto",
        hash_contrasena=ServicioAuth.obtener_hash_contrasena(cedula),
        rol="admin",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()

    login_res = await client.post("/auth/login", data={
        "username": cedula,
        "password": cedula
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    response = await client.patch(
        "/auth/password",
        json={
            "contrasena_actual": "ClaveEquivocada!",
            "nueva_contrasena": "NuevaClaveSegura99!"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400

    # Teardown
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_cambio_password_rechaza_nueva_clave_corta(client, db_session):
    """
    Verifica que PATCH /auth/password rechace contraseñas menores a 8 caracteres
    (validación del modelo Pydantic en backend).
    """
    cedula = "888000444"
    usuario_id = f"USR-{cedula}"

    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()

    usuario = Usuario(
        id=usuario_id,
        cedula=cedula,
        nombre="Test Password Corto",
        hash_contrasena=ServicioAuth.obtener_hash_contrasena(cedula),
        rol="admin",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()

    login_res = await client.post("/auth/login", data={
        "username": cedula,
        "password": cedula
    })
    token = login_res.json()["access_token"]

    response = await client.patch(
        "/auth/password",
        json={
            "contrasena_actual": cedula,
            "nueva_contrasena": "corta"  # < 8 chars
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 422  # Unprocessable Entity (Pydantic)

    # Teardown
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()


# ---------------------------------------------------------------------------
# Test 5: /auth/yo refleja password_set correctamente tras el cambio
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_yo_refleja_password_set_true_tras_cambio(client, db_session):
    """
    Verifica el ciclo completo:
      1. Usuario tiene hash = cédula → password_set=False en /auth/yo
      2. Cambia contraseña → password_set=True en /auth/yo
    """
    cedula = "888000555"
    usuario_id = f"USR-{cedula}"

    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()

    usuario = Usuario(
        id=usuario_id,
        cedula=cedula,
        nombre="Test YO Reflejo",
        hash_contrasena=ServicioAuth.obtener_hash_contrasena(cedula),
        rol="admin",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()

    login_res = await client.post("/auth/login", data={"username": cedula, "password": cedula})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Antes del cambio: password_set debe ser False
    yo_antes = await client.get("/auth/yo", headers=headers)
    assert yo_antes.status_code == 200
    assert yo_antes.json()["password_set"] is False

    # Cambiar contraseña
    await client.patch(
        "/auth/password",
        json={"contrasena_actual": cedula, "nueva_contrasena": "ClaveNueva2026!"},
        headers=headers
    )

    # Después del cambio: password_set debe ser True
    yo_despues = await client.get("/auth/yo", headers=headers)
    assert yo_despues.status_code == 200
    assert yo_despues.json()["password_set"] is True

    # Teardown
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()
