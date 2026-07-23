"""Regresiones para tokens de recuperacion persistidos y de un solo uso."""

import asyncio
import hashlib
import os
from datetime import timedelta
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlmodel import select

from app.config import config
from app.models.auth.usuario import Token, Usuario
from app.services.auth.recovery_token_service import generar_token_recuperacion
from app.services.auth.servicio import ServicioAuth
from app.services.erp.empleados_service import EmpleadosService
from app.utils_date import get_bogota_now


_CEDULA = "777000222"
_USUARIO_ID = f"USR-{_CEDULA}"


@pytest.fixture
async def admin_token(client):
    respuesta = await client.post(
        "/auth/login",
        data={
            "username": os.getenv("TEST_ADMIN_CEDULA", "admin"),
            "password": os.getenv("TEST_ADMIN_PASS", "admin123"),
        },
    )
    if respuesta.status_code != 200:
        pytest.skip("No hay credenciales administrativas de prueba")
    return respuesta.json()["access_token"]


@pytest.fixture
async def usuario_recuperacion(db_session):
    await db_session.execute(
        text("DELETE FROM tokens WHERE usuario_id = :id"), {"id": _USUARIO_ID}
    )
    await db_session.execute(
        text("DELETE FROM sesiones WHERE usuario_id = :id"), {"id": _USUARIO_ID}
    )
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": _USUARIO_ID}
    )
    usuario = Usuario(
        id=_USUARIO_ID,
        cedula=_CEDULA,
        nombre="Usuario Recuperacion Segura",
        correo="recuperacion.segura@example.com",
        correo_actualizado=True,
        correo_verificado=True,
        hash_contrasena=ServicioAuth.obtener_hash_contrasena("clave_anterior"),
        rol="usuario",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()

    yield usuario

    await db_session.execute(
        text("DELETE FROM tokens WHERE usuario_id = :id"), {"id": _USUARIO_ID}
    )
    await db_session.execute(
        text("DELETE FROM sesiones WHERE usuario_id = :id"), {"id": _USUARIO_ID}
    )
    await db_session.execute(
        text("DELETE FROM usuarios WHERE id = :id"), {"id": _USUARIO_ID}
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_token_recuperacion_solo_puede_usarse_una_vez(
    client, db_session, usuario_recuperacion
):
    token = await generar_token_recuperacion(
        db_session, usuario_recuperacion.id, origen="test"
    )
    await db_session.commit()

    primera = await client.post(
        "/auth/reset-password",
        json={"token": token, "nueva_contrasena": "NuevaClaveSegura123!"},
    )
    assert primera.status_code == 200

    segunda = await client.post(
        "/auth/reset-password",
        json={"token": token, "nueva_contrasena": "OtraClaveSegura456!"},
    )
    assert segunda.status_code == 400
    assert "inválido o expirado" in segunda.json()["detail"]


@pytest.mark.asyncio
async def test_token_persistido_esta_hasheado_y_expira(
    client, db_session, usuario_recuperacion
):
    token = await generar_token_recuperacion(
        db_session, usuario_recuperacion.id, origen="test_hash"
    )
    await db_session.commit()
    registro = (
        await db_session.execute(
            select(Token).where(
                Token.usuario_id == usuario_recuperacion.id,
                Token.ultimo_uso_en.is_(None),
            )
        )
    ).scalars().one()
    assert registro.hash_token == hashlib.sha256(token.encode("utf-8")).hexdigest()
    assert token not in registro.hash_token

    registro.expira_en = get_bogota_now() - timedelta(seconds=1)
    await db_session.commit()
    respuesta = await client.post(
        "/auth/reset-password",
        json={"token": token, "nueva_contrasena": "ClaveSeguraExpirada123!"},
    )
    assert respuesta.status_code == 400


@pytest.mark.asyncio
async def test_forgot_password_es_uniforme_para_cuentas_no_recuperables(
    client, db_session, usuario_recuperacion
):
    usuario_recuperacion.correo_verificado = False
    await db_session.commit()
    inexistente = await client.post(
        "/auth/forgot-password", json={"cedula": "000000009"}
    )
    no_verificado = await client.post(
        "/auth/forgot-password", json={"cedula": _CEDULA}
    )
    assert inexistente.status_code == no_verificado.status_code == 200
    assert inexistente.json() == no_verificado.json()


@pytest.mark.asyncio
async def test_setup_password_no_reclama_cuenta_bloqueada_con_secreto_aleatorio(
    client, usuario_recuperacion
):
    respuesta = await client.post(
        "/auth/setup-password",
        json={"cedula": _CEDULA, "contrasena": "ClaveAtacante123!"},
    )
    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == "El usuario ya tiene una contraseña configurada"


@pytest.mark.asyncio
async def test_refresh_rota_sesion_y_revoca_token_anterior(
    client, usuario_recuperacion
):
    login = await client.post(
        "/auth/login",
        data={"username": _CEDULA, "password": "clave_anterior"},
    )
    assert login.status_code == 200
    token_anterior = login.json()["access_token"]

    refresh = await client.post(
        "/auth/refresh",
        headers={"Authorization": f"Bearer {token_anterior}"},
    )
    assert refresh.status_code == 200
    token_nuevo = refresh.json()["access_token"]
    assert token_nuevo != token_anterior

    anterior = await client.get(
        "/auth/yo", headers={"Authorization": f"Bearer {token_anterior}"}
    )
    nuevo = await client.get(
        "/auth/yo", headers={"Authorization": f"Bearer {token_nuevo}"}
    )
    assert anterior.status_code == 401
    assert nuevo.status_code == 200


@pytest.mark.asyncio
async def test_refresh_concurrente_solo_rota_una_vez(client, usuario_recuperacion):
    login = await client.post(
        "/auth/login",
        data={"username": _CEDULA, "password": "clave_anterior"},
    )
    token = login.json()["access_token"]
    respuestas = await asyncio.gather(
        *[
            client.post(
                "/auth/refresh",
                headers={"Authorization": f"Bearer {token}"},
            )
            for _ in range(2)
        ]
    )
    assert sorted(respuesta.status_code for respuesta in respuestas) == [200, 401]


@pytest.mark.asyncio
async def test_consumo_concurrente_token_solo_cambia_clave_una_vez(
    client, db_session, usuario_recuperacion
):
    token = await generar_token_recuperacion(
        db_session, usuario_recuperacion.id, origen="test_concurrente"
    )
    await db_session.commit()
    respuestas = await asyncio.gather(
        *[
            client.post(
                "/auth/reset-password",
                json={"token": token, "nueva_contrasena": f"ClaveSegura{i}ABC!"},
            )
            for i in range(2)
        ]
    )
    assert sorted(respuesta.status_code for respuesta in respuestas) == [200, 400]


@pytest.mark.asyncio
async def test_generacion_concurrente_deja_un_solo_token_activo(
    db_session, usuario_recuperacion
):
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    fabrica = async_sessionmaker(engine, expire_on_commit=False)

    async def generar(origen: str):
        async with fabrica() as sesion:
            token = await generar_token_recuperacion(
                sesion, usuario_recuperacion.id, origen=origen
            )
            await sesion.commit()
            return token

    await asyncio.gather(generar("concurrente_1"), generar("concurrente_2"))
    activos = (
        await db_session.execute(
            select(Token).where(
                Token.usuario_id == usuario_recuperacion.id,
                Token.tipo_token == "password_recovery",
                Token.ultimo_uso_en.is_(None),
            )
        )
    ).scalars().all()
    await engine.dispose()
    assert len(activos) == 1


@pytest.mark.asyncio
async def test_reset_rechaza_contrasena_igual_a_cedula(
    client, db_session, usuario_recuperacion
):
    token = await generar_token_recuperacion(
        db_session, usuario_recuperacion.id, origen="test_cedula"
    )
    await db_session.commit()
    respuesta = await client.post(
        "/auth/reset-password",
        json={"token": token, "nueva_contrasena": _CEDULA},
    )
    assert respuesta.status_code == 400


@pytest.mark.asyncio
async def test_crear_analista_requiere_autenticacion(client):
    respuesta = await client.post("/auth/analistas/crear", json={"cedula": "123456789"})
    assert respuesta.status_code == 401


@pytest.mark.asyncio
async def test_crear_analista_rechaza_usuario_no_admin(
    client, usuario_recuperacion
):
    login = await client.post(
        "/auth/login",
        data={"username": _CEDULA, "password": "clave_anterior"},
    )
    token = login.json()["access_token"]
    respuesta = await client.post(
        "/auth/analistas/crear",
        json={"cedula": "123456789"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert respuesta.status_code == 403


@pytest.mark.asyncio
async def test_desactivar_usuario_revoca_sesion(
    client, usuario_recuperacion, admin_token
):
    login = await client.post(
        "/auth/login",
        data={"username": _CEDULA, "password": "clave_anterior"},
    )
    token = login.json()["access_token"]
    desactivar = await client.patch(
        f"/auth/analistas/{usuario_recuperacion.id}",
        json={"esta_activo": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert desactivar.status_code == 200
    respuesta = await client.get(
        "/auth/yo", headers={"Authorization": f"Bearer {token}"}
    )
    assert respuesta.status_code == 401


@pytest.mark.asyncio
async def test_promocion_sin_correo_verificado_preserva_estado(
    client, db_session, usuario_recuperacion, admin_token
):
    usuario_recuperacion.correo_verificado = False
    await db_session.commit()
    hash_anterior = usuario_recuperacion.hash_contrasena

    respuesta = await client.patch(
        f"/auth/analistas/{usuario_recuperacion.id}",
        json={"rol": "admin"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert respuesta.status_code == 400
    await db_session.refresh(usuario_recuperacion)
    assert usuario_recuperacion.rol == "usuario"
    assert usuario_recuperacion.hash_contrasena == hash_anterior


@pytest.mark.asyncio
async def test_login_concurrente_con_desactivacion_no_deja_sesion_valida(
    client, usuario_recuperacion, admin_token
):
    login, desactivar = await asyncio.gather(
        client.post(
            "/auth/login",
            data={"username": _CEDULA, "password": "clave_anterior"},
        ),
        client.patch(
            f"/auth/analistas/{usuario_recuperacion.id}",
            json={"esta_activo": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        ),
    )
    assert desactivar.status_code == 200
    assert login.status_code in (200, 403)
    if login.status_code == 200:
        token = login.json()["access_token"]
        perfil = await client.get(
            "/auth/yo", headers={"Authorization": f"Bearer {token}"}
        )
        assert perfil.status_code == 401


@pytest.mark.asyncio
async def test_token_verificacion_no_valida_un_correo_distinto(
    client, db_session, usuario_recuperacion
):
    token = ServicioAuth.crear_token_verificacion(
        usuario_recuperacion.id, usuario_recuperacion.correo
    )
    usuario_recuperacion.correo = "correo.distinto@example.com"
    usuario_recuperacion.correo_verificado = False
    await db_session.commit()

    respuesta = await client.get(f"/auth/verify-email?token={token}")
    assert respuesta.status_code == 400
    await db_session.refresh(usuario_recuperacion)
    assert usuario_recuperacion.correo_verificado is False


@pytest.mark.asyncio
async def test_sincronizacion_erp_invalida_verificacion_y_tokens(
    db_session, usuario_recuperacion, monkeypatch
):
    await generar_token_recuperacion(
        db_session, usuario_recuperacion.id, origen="antes_cambio_correo"
    )
    await db_session.commit()

    async def empleado_actualizado(_db_erp, _cedula):
        return {
            "nombre": usuario_recuperacion.nombre,
            "correocorporativo": "nuevo.correo@example.com",
        }

    monkeypatch.setattr(
        EmpleadosService, "obtener_empleado_por_cedula", empleado_actualizado
    )
    await ServicioAuth.sincronizar_perfil_desde_erp(
        db_session, object(), usuario_recuperacion
    )

    assert usuario_recuperacion.correo == "nuevo.correo@example.com"
    assert usuario_recuperacion.correo_verificado is False
    activos = (
        await db_session.execute(
            select(Token).where(
                Token.usuario_id == usuario_recuperacion.id,
                Token.tipo_token == "password_recovery",
                Token.ultimo_uso_en.is_(None),
            )
        )
    ).scalars().all()
    assert activos == []
