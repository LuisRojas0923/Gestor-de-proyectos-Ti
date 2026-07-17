"""Contratos de sesión e identidad incorporados al cierre de Fase 1P."""
import asyncio
from datetime import timedelta
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.exc import IntegrityError

from app.config import Configuracion
from app.services.auth.provisioning_service import crear_analista_desde_erp
from app.services.auth.sesion_service import (
    invalidar_sesiones_usuario,
    marcar_fin_sesion,
    registrar_sesion,
    rotar_sesion_web,
)
from app.services.auth.servicio import ServicioAuth
from app.services.erp.empleados_service import EmpleadosService
from app.utils_date import get_bogota_now


@pytest.mark.asyncio
async def test_invalidation_error_se_propaga():
    db = AsyncMock()
    db.execute.side_effect = RuntimeError("fallo de revocación")

    with pytest.raises(RuntimeError, match="fallo de revocación"):
        await invalidar_sesiones_usuario(db, "USR-1")


@pytest.mark.asyncio
async def test_refresh_renueva_expiracion_y_solo_una_rotacion_gana():
    db = AsyncMock()
    db.execute.return_value.rowcount = 1
    nueva_expiracion = get_bogota_now() + timedelta(minutes=30)

    assert await rotar_sesion_web(
        db, "token-anterior", "token-nuevo", nueva_expiracion
    )
    statement = str(db.execute.await_args.args[0])
    assert "sesiones.tipo_sesion" in statement
    assert "sesiones.expira_en" in statement
    assert db.commit.await_count == 1


def test_token_recuperacion_se_invalida_al_cambiar_hash():
    token = ServicioAuth.crear_token_recuperacion("USR-1", "hash-anterior")

    assert ServicioAuth.validar_token_recuperacion(token, "hash-anterior") == "USR-1"
    assert ServicioAuth.validar_token_recuperacion(token, "hash-nuevo") is None


def test_produccion_rechaza_secreto_jwt_publico():
    for secreto in (
        "clave-segura-cambiar",
        "cambiar-en-produccion-usar-openssl-rand",
    ):
        with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
            Configuracion(environment="production", jwt_secret_key=secreto)


def test_payload_mcp_es_estricto():
    from app.models.auth.usuario import McpTokenCrear

    assert McpTokenCrear().scope == "read"
    with pytest.raises(ValueError):
        McpTokenCrear(scope="admin", vigencia_dias=120)


@pytest.mark.asyncio
async def test_carrera_crear_analista_hace_rollback_y_retorna_error_controlado(
    monkeypatch,
):
    monkeypatch.setattr(
        ServicioAuth,
        "obtener_usuario_por_cedula",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        EmpleadosService,
        "obtener_empleado_por_cedula",
        AsyncMock(return_value={"nombre": "Analista"}),
    )
    db = AsyncMock()
    db.add = Mock()
    db.flush.side_effect = IntegrityError("INSERT", {}, Exception("duplicado"))

    with pytest.raises(ValueError, match="ya existe"):
        await crear_analista_desde_erp(db, object(), "123", "ADM-1")
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_analista_nuevo_no_es_reclamable_con_cedula(monkeypatch):
    def cerrar_tarea(coroutine):
        coroutine.close()
        return Mock()

    monkeypatch.setattr(asyncio, "create_task", cerrar_tarea)
    monkeypatch.setattr(
        ServicioAuth, "obtener_usuario_por_cedula", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        EmpleadosService,
        "obtener_empleado_por_cedula",
        AsyncMock(return_value={
            "nombre": "Analista",
            "correocorporativo": "analista@empresa.test",
        }),
    )
    monkeypatch.setattr(
        "app.services.auth.protected_identity_service.actualizar_rol_protegido",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "app.services.notifications.email_service.EmailService.enviar_notificacion_reseteo_clave",
        Mock(),
    )
    db = AsyncMock()
    db.add = Mock()

    await crear_analista_desde_erp(db, object(), "123", "ADM-1")

    usuario = db.add.call_args.args[0]
    assert ServicioAuth.verificar_contrasena("123", usuario.hash_contrasena) is False
    assert usuario.correo_verificado is True


@pytest.mark.asyncio
async def test_hash_recuperacion_se_actualiza_por_compare_and_swap(monkeypatch):
    from app.services.auth.protected_identity_service import actualizar_hash_si_vigente

    monkeypatch.setattr(
        "app.services.auth.protected_identity_service.obtener_capacidad_rbac",
        Mock(return_value="capacidad-segura"),
    )
    db = AsyncMock()
    result = Mock()
    result.scalar_one.return_value = False
    db.execute.return_value = result

    assert not await actualizar_hash_si_vigente(db, "USR-1", "anterior", "nuevo")
    statement = str(db.execute.await_args.args[0])
    assert "auth_consumir_token_recuperacion" in statement


@pytest.mark.asyncio
async def test_registro_y_logout_de_sesion_propagan_fallos():
    db = AsyncMock()
    db.add = Mock()
    db.commit.side_effect = RuntimeError("persistencia no disponible")

    with pytest.raises(RuntimeError, match="persistencia no disponible"):
        await registrar_sesion(db, "USR-1", "jwt")

    db.reset_mock()
    db.execute.side_effect = RuntimeError("revocacion no disponible")
    with pytest.raises(RuntimeError, match="revocacion no disponible"):
        await marcar_fin_sesion(db, "jwt")
