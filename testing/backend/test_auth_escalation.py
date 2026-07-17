"""Regresiones de sesiones y credenciales durante cambios de rol."""

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

TEST_ADMIN_CEDULA = os.getenv("TEST_ADMIN_CEDULA", "admin")
TEST_ADMIN_PASS = os.getenv("TEST_ADMIN_PASS", "")

_CEDULA_ESCALADO = "777000111"
_ID_ESCALADO = f"USR-{_CEDULA_ESCALADO}"

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
        rol="usuario",  # rol sin acceso admin → era_admin=False → reset dispara al escalar
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


@pytest.mark.asyncio
async def test_escalado_rol_preserva_password_y_revoca_token(
    client, admin_token, usuario_escalado, db_session
):
    """Elevar privilegios conserva la clave, pero revoca sesiones previas."""
    if not admin_token:
        pytest.skip("No hay token admin disponible. Verificar TEST_ADMIN_CEDULA/TEST_ADMIN_PASS.")
    login = await client.post("/auth/login", data={
        "username": _CEDULA_ESCALADO, "password": "clave_inicial"
    })
    assert login.status_code == 200
    hash_original = usuario_escalado.hash_contrasena
    response = await client.patch(
        f"/auth/analistas/{_ID_ESCALADO}", json={"rol": "admin"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    await db_session.refresh(usuario_escalado)
    assert usuario_escalado.hash_contrasena == hash_original
    previo = await client.get("/auth/yo", headers={
        "Authorization": f"Bearer {login.json()['access_token']}"
    })
    assert previo.status_code == 401


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


@pytest.mark.asyncio
async def test_cambio_forzado_password_exitoso(client, db_session):
    """
    Verifica que PATCH /auth/password permita a un usuario cambiar su clave
    cuando la clave actual es válida.
    """
    cedula = "888000222"
    usuario_id = f"USR-{cedula}"
    clave_temporal = "ClaveTemporal2026!"
    clave_nueva = "NuevaClaveSegura99!"

    # Setup: usuario con hash = cédula (post-escalado)
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()

    usuario = Usuario(
        id=usuario_id,
        cedula=cedula,
        nombre="Test Cambio Password",
        hash_contrasena=ServicioAuth.obtener_hash_contrasena(cedula),
        rol="admin",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()

    # Setup password primero (post-escalado: login bloqueado hasta configurar)
    setup_res = await client.post("/auth/setup-password", json={
        "cedula": cedula,
        "contrasena": clave_temporal
    })
    assert setup_res.status_code == 200

    # Login para obtener token
    login_res = await client.post("/auth/login", data={
        "username": cedula,
        "password": clave_temporal
    })
    assert login_res.status_code == 200, f"Login falló: {login_res.text}"
    token = login_res.json()["access_token"]

    # Cambiar contraseña
    response = await client.patch(
        "/auth/password",
        json={
            "contrasena_actual": clave_temporal,
            "nueva_contrasena": clave_nueva
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, f"Cambio de password falló: {response.text}"

    # Verificar que el nuevo hash ya no es la cédula ni temporal
    await db_session.refresh(usuario)
    assert ServicioAuth.es_password_configurado(usuario.hash_contrasena, cedula) is True
    assert ServicioAuth.verificar_contrasena(clave_nueva, usuario.hash_contrasena)

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
    clave_temporal = "ClaveTemporal2026!"

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

    # Setup password primero
    await client.post("/auth/setup-password", json={
        "cedula": cedula,
        "contrasena": clave_temporal
    })

    login_res = await client.post("/auth/login", data={
        "username": cedula,
        "password": clave_temporal
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
    clave_temporal = "ClaveTemporal2026!"

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

    # Setup password primero
    await client.post("/auth/setup-password", json={
        "cedula": cedula,
        "contrasena": clave_temporal
    })

    login_res = await client.post("/auth/login", data={
        "username": cedula,
        "password": clave_temporal
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    response = await client.patch(
        "/auth/password",
        json={
            "contrasena_actual": clave_temporal,
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


@pytest.mark.asyncio
async def test_yo_refleja_password_set_true_tras_cambio(client, db_session):
    """
    Verifica el ciclo completo:
      1. Usuario tiene hash = cédula → password_status retorna configurado=False
      2. Configura contraseña via setup-password → login funciona
      3. /auth/yo retorna password_set=True
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

    # Verificar que password_status retorna configurado=False
    status_res = await client.get(f"/auth/password-status/{cedula}")
    assert status_res.status_code == 200
    assert status_res.json()["configurado"] is False
    assert status_res.json()["existe"] is True

    # Configurar contraseña via setup-password
    setup_res = await client.post("/auth/setup-password", json={
        "cedula": cedula,
        "contrasena": "ClaveNueva2026!"
    })
    assert setup_res.status_code == 200

    # Login con la nueva contraseña
    login_res = await client.post("/auth/login", data={
        "username": cedula,
        "password": "ClaveNueva2026!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # /auth/yo debe retornar password_set=True
    yo_res = await client.get("/auth/yo", headers=headers)
    assert yo_res.status_code == 200
    assert yo_res.json()["password_set"] is True

    # Teardown
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id}
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_resetear_contrasena_analista_exito(client, db_session, admin_token):
    """El reset usa bloqueo aleatorio, correo verificado y revoca el token."""
    if not admin_token:
        pytest.skip("No hay token admin disponible.")
    cedula_usuario = "999888777"
    id_usuario = f"USR-{cedula_usuario}"

    # Limpiar previamente
    await db_session.execute(
        text("DELETE FROM sesiones WHERE usuario_id = :id"), {"id": id_usuario}
    )
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": id_usuario}
    )
    await db_session.commit()

    # Crear usuario de prueba
    usuario = Usuario(
        id=id_usuario,
        cedula=cedula_usuario,
        nombre="Usuario Para Reset",
        hash_contrasena=ServicioAuth.obtener_hash_contrasena("ClaveSuperSegura123!"),
        correo="reset@example.test",
        correo_actualizado=True,
        correo_verificado=True,
        rol="usuario",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()

    login = await client.post("/auth/login", data={
        "username": cedula_usuario, "password": "ClaveSuperSegura123!"
    })
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await client.post(
        f"/auth/analistas/{id_usuario}/reset-password",
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["mensaje"] == "Contraseña reseteada exitosamente"

    await db_session.refresh(usuario)
    assert not ServicioAuth.verificar_contrasena(cedula_usuario, usuario.hash_contrasena)
    assert not ServicioAuth.verificar_contrasena("ClaveSuperSegura123!", usuario.hash_contrasena)
    previo = await client.get("/auth/yo", headers={
        "Authorization": f"Bearer {login.json()['access_token']}"
    })
    assert previo.status_code == 401

    # Teardown
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": id_usuario}
    )
    await db_session.commit()
