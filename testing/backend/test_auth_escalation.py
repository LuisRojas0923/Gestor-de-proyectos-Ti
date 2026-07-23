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

from app.models.auth.usuario import Usuario, Sesion, Token
from app.services.auth.servicio import ServicioAuth
from app.config import config

load_dotenv()

TEST_ADMIN_CEDULA = os.getenv("TEST_ADMIN_CEDULA", "admin")
TEST_ADMIN_PASS = os.getenv("TEST_ADMIN_PASS", "admin123")

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
        text("DELETE FROM tokens WHERE usuario_id = :id"),
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
        correo="escalado.seguro@example.com",
        correo_actualizado=True,
        correo_verificado=True,
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
        text("DELETE FROM tokens WHERE usuario_id = :id"),
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
async def test_password_set_false_cuando_hash_es_cedula():
    """
    Verifica que es_password_configurado() devuelva False cuando el hash
    corresponde a la propia cédula del usuario (cuenta heredada pendiente).
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

    Al escalar un usuario de 'usuario' a 'admin' vía PATCH /auth/analistas/:id,
    incluso si el rol anterior ya tenía acceso limitado a un módulo de panel:
      - El hash debe cambiar a un secreto aleatorio inaccesible
      - Debe emitirse un token de activación de un solo uso
      - Las sesiones anteriores deben quedar revocadas
    """
    if not admin_token:
        pytest.skip("No hay token admin disponible. Verificar TEST_ADMIN_CEDULA/TEST_ADMIN_PASS.")

    from app.models.auth.usuario import ModuloSistema, PermisoRol, Sesion, Token

    # Crear un módulo de test controlado con permisos exactos:
    # - admin: permitido=True → tiene_acceso_admin = True
    # - usuario: permitido=True → ya tiene acceso limitado al panel, pero la
    #   promoción explícita a admin debe resetear sus credenciales igualmente.
    _MODULO_TEST_ID = "panel_test_escalado"

    # Limpiar y recrear para garantizar estado conocido
    await db_session.execute(
        text("DELETE FROM permisos_rol WHERE modulo = :m"), {"m": _MODULO_TEST_ID}
    )
    await db_session.execute(
        text("DELETE FROM modulos_sistema WHERE id = :m"), {"m": _MODULO_TEST_ID}
    )
    await db_session.commit()

    modulo_test = ModuloSistema(
        id=_MODULO_TEST_ID, nombre="Panel Test Escalado", categoria="panel", esta_activo=True
    )
    db_session.add(modulo_test)
    await db_session.flush()

    permiso_admin = PermisoRol(rol="admin", modulo=_MODULO_TEST_ID, permitido=True)
    permiso_usuario = PermisoRol(rol="usuario", modulo=_MODULO_TEST_ID, permitido=True)
    db_session.add_all([permiso_admin, permiso_usuario])
    await db_session.commit()

    try:
        login_usuario = await client.post(
            "/auth/login",
            data={"username": _CEDULA_ESCALADO, "password": "clave_inicial"},
        )
        assert login_usuario.status_code == 200
        token_anterior = login_usuario.json()["access_token"]

        headers = {"Authorization": f"Bearer {admin_token}"}
        response = await client.patch(
            f"/auth/analistas/{_ID_ESCALADO}",
            json={"rol": "admin"},
            headers=headers
        )

        assert response.status_code == 200, f"Escalado falló: {response.text}"

        # La cuenta queda bloqueada con un secreto aleatorio hasta que el
        # usuario consuma el enlace de activación enviado a su correo.
        await db_session.refresh(usuario_escalado)
        assert not ServicioAuth.verificar_contrasena(
            _CEDULA_ESCALADO, usuario_escalado.hash_contrasena
        )
        assert not ServicioAuth.verificar_contrasena(
            "clave_inicial", usuario_escalado.hash_contrasena
        )

        token_recuperacion = (
            await db_session.execute(
                select(Token).where(
                    Token.usuario_id == _ID_ESCALADO,
                    Token.tipo_token == "password_recovery",
                    Token.ultimo_uso_en.is_(None),
                )
            )
        ).scalars().first()
        assert token_recuperacion is not None

        sesion_anterior = (
            await db_session.execute(
                select(Sesion).where(Sesion.token_sesion == token_anterior)
            )
        ).scalars().one()
        assert sesion_anterior.fin_sesion is not None

        respuesta_token_anterior = await client.get(
            "/auth/yo",
            headers={"Authorization": f"Bearer {token_anterior}"},
        )
        assert respuesta_token_anterior.status_code == 401

    finally:
        await db_session.execute(
            text("DELETE FROM permisos_rol WHERE modulo = :m"),
            {"m": _MODULO_TEST_ID}
        )
        await db_session.execute(
            text("DELETE FROM modulos_sistema WHERE id = :m"),
            {"m": _MODULO_TEST_ID}
        )
        await db_session.commit()


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
    clave_temporal = "ClaveTemporal2026!"
    clave_nueva = "NuevaClaveSegura99!"

    # Setup: usuario heredado con hash = cédula
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

    # Setup password primero para la cuenta heredada pendiente
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


# ---------------------------------------------------------------------------
# Test 5: /auth/yo refleja password_set correctamente tras el cambio
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Test 6: Reseteo manual de contraseña por administrador
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resetear_contrasena_analista_exito(client, db_session, admin_token):
    """
    Verifica que el reset administrativo bloquee la clave anterior y emita un
    token de recuperación, sin usar la cédula como contraseña temporal.
    """
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
        correo="reset.seguro@example.com",
        correo_actualizado=True,
        correo_verificado=True,
        hash_contrasena=ServicioAuth.obtener_hash_contrasena("ClaveSuperSegura123!"),
        rol="usuario",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()

    # Intentar resetear como admin
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await client.post(
        f"/auth/analistas/{id_usuario}/reset-password",
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["mensaje"] == "Contraseña reseteada exitosamente"

    # Verificar bloqueo seguro y token de activación pendiente.
    await db_session.refresh(usuario)
    assert not ServicioAuth.verificar_contrasena(cedula_usuario, usuario.hash_contrasena)
    assert not ServicioAuth.verificar_contrasena(
        "ClaveSuperSegura123!", usuario.hash_contrasena
    )
    token_recuperacion = (
        await db_session.execute(
            select(Token).where(
                Token.usuario_id == id_usuario,
                Token.tipo_token == "password_recovery",
                Token.ultimo_uso_en.is_(None),
            )
        )
    ).scalars().first()
    assert token_recuperacion is not None

    # Teardown
    await db_session.execute(text("DELETE FROM tokens WHERE usuario_id = :id"), {"id": id_usuario})
    await db_session.execute(text("DELETE FROM usuarios WHERE id = :id"), {"id": id_usuario})
    await db_session.commit()
