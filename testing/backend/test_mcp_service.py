"""
Test unit F5.2: mcp_service.emitir_token_mcp y listar_tokens_mcp_activos.

Cubre:
- emitir_token_mcp happy path → devuelve jti + token firmado
- validar vigencia fuera de rango (1-90) → 400
- validar scope invalido → 400
- usuario inactivo → 403
- listar_tokens_mcp_activos retorna solo los no revocados y no expirados
- dos emisiones del mismo usuario generan jtis distintos
- sesion queda registrada con tipo_sesion='mcp' y jti alineado al JWT

Requiere DB (la del .env.test). Pico RAM ~150MB.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest
from fastapi import HTTPException
from jose import jwt
from sqlalchemy import select

from app.config import config
from app.models.auth.usuario import Sesion, Usuario
from app.services.auth.mcp_service import (
    VIGENCIA_DEFAULT_DIAS,
    VIGENCIA_MAXIMA_DIAS,
    emitir_token_mcp,
    listar_tokens_mcp_activos,
)
from app.services.auth.servicio import ServicioAuth
from app.utils_date import get_bogota_now


CEDULA_TEST = "9900110099"
USUARIO_ID = "USR-TEST-MCP-1"


@pytest.fixture
async def usuario_mcp(db_session):
    """Crea un usuario activo para los tests de emision."""
    usuario = Usuario(
        id=USUARIO_ID,
        cedula=CEDULA_TEST,
        nombre="Test MCP",
        hash_contrasena=ServicioAuth.obtener_hash_contrasena("cualquiera"),
        rol="admin",
        esta_activo=True,
    )
    db_session.add(usuario)
    await db_session.commit()
    await db_session.refresh(usuario)
    yield usuario
    # Cleanup
    await db_session.execute(
        Sesion.__table__.delete().where(Sesion.usuario_id == USUARIO_ID)
    )
    await db_session.execute(
        Usuario.__table__.delete().where(Usuario.id == USUARIO_ID)
    )
    await db_session.commit()


class TestEmitirTokenMcpHappyPath:
    """emitir_token_mcp con parámetros válidos retorna un token usable."""

    async def test_devuelve_campos_esperados(self, db_session, usuario_mcp):
        """El dict retornado debe tener access_token, jti, expires_at, scope."""
        resultado = await emitir_token_mcp(
            db_session,
            usuario_mcp,
            vigencia_dias=30,
            scope="read",
            motivo="unit test",
        )
        assert "access_token" in resultado
        assert "jti" in resultado
        assert "expires_at" in resultado
        assert "scope" in resultado
        assert "vigencia_dias" in resultado
        assert resultado["scope"] == "read"
        assert resultado["vigencia_dias"] == 30

    async def test_jti_es_uuid_valido(self, db_session, usuario_mcp):
        """jti debe parsear como UUID."""
        resultado = await emitir_token_mcp(db_session, usuario_mcp)
        UUID(resultado["jti"])  # raises si no es UUID

    async def test_token_es_jwt_firmado_con_secreto_backend(self, db_session, usuario_mcp):
        """El token retornado debe decodificar con config.jwt_secret_key."""
        resultado = await emitir_token_mcp(db_session, usuario_mcp, scope="write")
        payload = jwt.decode(
            resultado["access_token"],
            config.jwt_secret_key,
            algorithms=[config.algorithm],
        )
        assert payload["sub"] == CEDULA_TEST
        assert payload["rol"] == "admin"
        assert payload["scope"] == "write"
        assert payload["token_type"] == "mcp"
        assert payload["jti"] == resultado["jti"]

    async def test_dos_emisiones_generan_jtis_distintos(self, db_session, usuario_mcp):
        """Cada emision crea un jti nuevo (no se reutilizan)."""
        r1 = await emitir_token_mcp(db_session, usuario_mcp)
        r2 = await emitir_token_mcp(db_session, usuario_mcp)
        assert r1["jti"] != r2["jti"]

    async def test_sesion_registrada_con_tipo_mcp_y_jti_alineado(
        self, db_session, usuario_mcp
    ):
        """La fila en sesiones debe tener tipo_sesion='mcp' y jti del JWT."""
        resultado = await emitir_token_mcp(db_session, usuario_mcp)
        sesion = (
            await db_session.execute(
                select(Sesion).where(Sesion.jti == resultado["jti"])
            )
        ).scalars().first()
        assert sesion is not None
        assert sesion.tipo_sesion == "mcp"
        assert sesion.scope == "read"
        assert sesion.usuario_id == usuario_mcp.id
        # El token_sesion guardado debe coincidir con el access_token retornado
        assert sesion.token_sesion == resultado["access_token"]


class TestEmitirTokenMcpValidaciones:
    """emitir_token_mcp rechaza parámetros inválidos antes de tocar la DB."""

    async def test_vigencia_cero_rechazada(self, db_session, usuario_mcp):
        with pytest.raises(HTTPException) as excinfo:
            await emitir_token_mcp(db_session, usuario_mcp, vigencia_dias=0)
        assert excinfo.value.status_code == 400
        assert "1 y 90" in str(excinfo.value.detail) or "rango" in str(excinfo.value.detail).lower()

    async def test_vigencia_negativa_rechazada(self, db_session, usuario_mcp):
        with pytest.raises(HTTPException) as excinfo:
            await emitir_token_mcp(db_session, usuario_mcp, vigencia_dias=-5)
        assert excinfo.value.status_code == 400

    async def test_vigencia_mayor_a_maximo_rechazada(self, db_session, usuario_mcp):
        with pytest.raises(HTTPException) as excinfo:
            await emitir_token_mcp(db_session, usuario_mcp, vigencia_dias=VIGENCIA_MAXIMA_DIAS + 1)
        assert excinfo.value.status_code == 400
        assert str(VIGENCIA_MAXIMA_DIAS) in str(excinfo.value.detail)

    async def test_scope_invalido_rechazado(self, db_session, usuario_mcp):
        with pytest.raises(HTTPException) as excinfo:
            await emitir_token_mcp(db_session, usuario_mcp, scope="admin")
        assert excinfo.value.status_code == 400
        assert "scope" in str(excinfo.value.detail).lower()

    async def test_usuario_inactivo_rechazado(self, db_session, usuario_mcp):
        usuario_mcp.esta_activo = False
        await db_session.commit()
        with pytest.raises(HTTPException) as excinfo:
            await emitir_token_mcp(db_session, usuario_mcp)
        assert excinfo.value.status_code == 403
        assert "inactivo" in str(excinfo.value.detail).lower()


class TestListarTokensMcpActivos:
    """listar_tokens_mcp_activos filtra revocados y expirados."""

    async def test_lista_token_recien_emitido(self, db_session, usuario_mcp):
        await emitir_token_mcp(db_session, usuario_mcp)
        tokens = await listar_tokens_mcp_activos(db_session, usuario_mcp)
        assert len(tokens) == 1
        t = tokens[0]
        assert t["scope"] == "read"
        assert t["expira_en"] is not None

    async def test_excluye_tokens_revocados(self, db_session, usuario_mcp):
        from app.services.auth.mcp_service import revocar_token_mcp
        r = await emitir_token_mcp(db_session, usuario_mcp)
        await revocar_token_mcp(db_session, usuario_mcp, r["jti"])
        tokens = await listar_tokens_mcp_activos(db_session, usuario_mcp)
        assert len(tokens) == 0

    async def test_excluye_tokens_expirados(self, db_session, usuario_mcp):
        """Un token con expira_en en el pasado no debe aparecer."""
        # Insertar sesion manualmente con expira_en en el pasado
        r = await emitir_token_mcp(db_session, usuario_mcp, vigencia_dias=30)
        sesion = (
            await db_session.execute(
                select(Sesion).where(Sesion.jti == r["jti"])
            )
        ).scalars().first()
        # Forzar expiracion: 1 dia en el pasado
        sesion.expira_en = get_bogota_now() - timedelta(days=1)
        await db_session.commit()
        tokens = await listar_tokens_mcp_activos(db_session, usuario_mcp)
        assert len(tokens) == 0

    async def test_excluye_tokens_de_otro_usuario(self, db_session, usuario_mcp):
        """Un token de otro usuario no debe aparecer en la lista."""
        # Crear OTRO usuario y emitir token para él
        otro = Usuario(
            id="USR-TEST-MCP-OTRO",
            cedula="8800220088",
            nombre="Otro",
            hash_contrasena=ServicioAuth.obtener_hash_contrasena("cualquiera"),
            rol="admin",
            esta_activo=True,
        )
        db_session.add(otro)
        await db_session.commit()
        await emitir_token_mcp(db_session, otro)
        # El usuario_mcp no debe ver ese token
        tokens = await listar_tokens_mcp_activos(db_session, usuario_mcp)
        assert len(tokens) == 0
        # Cleanup
        await db_session.execute(
            Sesion.__table__.delete().where(Sesion.usuario_id == "USR-TEST-MCP-OTRO")
        )
        await db_session.execute(
            Usuario.__table__.delete().where(Usuario.id == "USR-TEST-MCP-OTRO")
        )
        await db_session.commit()

    async def test_excluye_sesiones_web_tipo_session(self, db_session, usuario_mcp):
        """Solo sesiones tipo_sesion='mcp' aparecen, no las web."""
        # Crear sesion web manualmente
        sesion_web = Sesion(
            usuario_id=usuario_mcp.id,
            token_sesion="fake-web-token",
            tipo_sesion="web",
            jti="mock-jti-web-2",
            expira_en=get_bogota_now() + timedelta(hours=8),
        )
        db_session.add(sesion_web)
        await db_session.commit()
        # Emitir un token MCP
        await emitir_token_mcp(db_session, usuario_mcp)
        tokens = await listar_tokens_mcp_activos(db_session, usuario_mcp)
        assert len(tokens) == 1
        assert all(t["scope"] == "read" for t in tokens)
