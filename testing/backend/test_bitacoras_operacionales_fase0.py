"""Pruebas de seguridad transversales requeridas por Bitacoras Fase 0."""
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import UUID

import pytest
from fastapi.routing import APIRoute, APIWebSocketRoute
from pydantic import ValidationError

from app.api.notificaciones.router import router as notificaciones_router
from app.models.alerta.notificacion import NotificacionUsuarioCrear
from app.models.auditoria.accion_usuario import AccionAuditoria
from app.models.auth.usuario import PermisoRolActualizar
from app.services.auditoria.servicio import ServicioAuditoria
from app.services.notificacion.servicio import ServicioNotificacion
from app.services.notificacion.ws_manager import NotificationConnectionManager


@pytest.mark.parametrize(
    "compose_path",
    ["docker-compose.prod.yml", "docker-compose.Pruebas3.yml"],
)
def test_redis_despliegue_exige_password(compose_path):
    contenido = Path(compose_path).read_text(encoding="utf-8")

    assert "--requirepass" in contenido
    assert "REDIS_PASSWORD:?REDIS_PASSWORD requerido" in contenido
    assert "REDIS_URL=redis://redis:6379/0" in contenido
    assert "REDIS_PASSWORD=${REDIS_PASSWORD:?REDIS_PASSWORD requerido}" in contenido
    assert "condition: service_healthy" in contenido


def test_permiso_rbac_admite_identificador_granular_con_puntos():
    permiso = PermisoRolActualizar(
        rol="coordinador",
        modulo="bitacoras_operacionales.leer",
        permitido=True,
    )

    assert permiso.modulo == "bitacoras_operacionales.leer"


@pytest.mark.parametrize(
    "modulo",
    [
        "bitacoras_operacionales.*",
        "bitacoras operacionales.leer",
        "../leer",
        ".bitacoras_operacionales",
        "bitacoras_operacionales.",
        "bitacoras_operacionales..leer",
    ],
)
def test_permiso_rbac_rechaza_comodines_y_separadores_peligrosos(modulo):
    with pytest.raises(ValidationError):
        PermisoRolActualizar(
            rol="coordinador",
            modulo=modulo,
            permitido=True,
        )


def test_api_notificaciones_expone_solo_recursos_del_usuario_actual():
    rutas_http = {
        (route.path, method): route
        for route in notificaciones_router.routes
        if isinstance(route, APIRoute)
        for method in route.methods
    }
    rutas_ws = {
        route.path: route
        for route in notificaciones_router.routes
        if isinstance(route, APIWebSocketRoute)
    }

    listar = rutas_http[("/mias", "GET")]
    marcar = rutas_http[("/mias/{notificacion_id}/leido", "PUT")]
    ticket = rutas_http[("/ws-ticket", "POST")]
    for route in (listar, marcar, ticket):
        dependencias = {dep.call.__name__ for dep in route.dependant.dependencies}
        assert "obtener_usuario_actual_db" in dependencias

    assert ("/", "POST") not in rutas_http
    assert "/ws" in rutas_ws
    assert "/ws/{usuario_id}" not in rutas_ws
    dependencias_ws = {
        dep.call.__name__ for dep in rutas_ws["/ws"].dependant.dependencies
    }
    assert "obtener_db" not in dependencias_ws


@pytest.mark.asyncio
async def test_crear_notificacion_sin_commit_deja_transaccion_al_orquestador():
    db = SimpleNamespace(
        add=Mock(),
        flush=AsyncMock(),
        refresh=AsyncMock(),
        commit=AsyncMock(),
    )
    entrada = NotificacionUsuarioCrear(
        usuario_id="USR-1",
        titulo="Bitacora lista",
        mensaje="El PDF esta disponible",
        tipo_evento="bitacora_finalizada",
        referencia_id="BIT-1",
    )

    notificacion = await ServicioNotificacion.crear_notificacion_sin_commit(db, entrada)

    assert notificacion.usuario_id == "USR-1"
    db.add.assert_called_once()
    db.flush.assert_awaited_once()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_actualizar_notificacion_filtra_por_propietario():
    resultado = SimpleNamespace(scalar_one_or_none=lambda: None)
    db = SimpleNamespace(execute=AsyncMock(return_value=resultado))

    notificacion = await ServicioNotificacion.actualizar_estado_leido_propio(
        db,
        notificacion_id=7,
        usuario_id="USR-A",
        leido=True,
    )

    assert notificacion is None
    consulta = str(db.execute.await_args.args[0])
    assert "notificaciones_usuario.usuario_id" in consulta


class RedisTicketsFalso:
    def __init__(self):
        self.valores = {}

    async def set(self, clave, valor, *, ex, nx):
        if nx and clave in self.valores:
            return False
        self.valores[clave] = valor
        return ex > 0

    async def getdel(self, clave):
        return self.valores.pop(clave, None)


@pytest.mark.asyncio
async def test_ticket_websocket_es_aleatorio_y_de_un_solo_uso():
    manager = NotificationConnectionManager()
    manager.redis_client = RedisTicketsFalso()

    ticket = await manager.emitir_ticket_ws(
        "USR-1",
        "hash-sesion",
        "https://portal.example.com",
    )
    primero = await manager.consumir_ticket_ws(ticket)
    segundo = await manager.consumir_ticket_ws(ticket)

    assert len(ticket) >= 32
    assert primero == {
        "usuario_id": "USR-1",
        "sesion_hash": "hash-sesion",
        "origen": "https://portal.example.com",
    }
    assert segundo is None


@pytest.mark.asyncio
async def test_ticket_websocket_falla_cerrado_sin_redis(monkeypatch):
    manager = NotificationConnectionManager()

    async def redis_no_disponible():
        manager.redis_client = None

    monkeypatch.setattr(manager, "_init_redis", redis_no_disponible)

    with pytest.raises(RuntimeError, match="tickets no disponible"):
        await manager.emitir_ticket_ws(
            "USR-1",
            "hash-sesion",
            "https://portal.example.com",
        )


@pytest.mark.asyncio
async def test_websocket_cierra_1013_si_falla_validacion_postgres(monkeypatch):
    import app.api.notificaciones.router as notificaciones_api

    class ConexionFalsa:
        headers = {
            "origin": "https://portal.example.com",
            "sec-websocket-protocol": "notificaciones.v1, ticket.ticket-valido",
        }

        def __init__(self):
            self.close = AsyncMock()

    class SesionFallida:
        async def __aenter__(self):
            raise RuntimeError("PostgreSQL no disponible")

        async def __aexit__(self, *_args):
            return False

    conexion = ConexionFalsa()
    monkeypatch.setattr(notificaciones_api, "_origen_websocket_permitido", lambda _origen: True)
    monkeypatch.setattr(
        notificaciones_api.notification_manager,
        "consumir_ticket_ws",
        AsyncMock(return_value={
            "usuario_id": "USR-1",
            "sesion_hash": "hash-sesion",
            "origen": "https://portal.example.com",
        }),
    )
    monkeypatch.setattr(notificaciones_api, "AsyncSessionLocal", SesionFallida)

    await notificaciones_api.websocket_notificaciones(conexion)

    conexion.close.assert_awaited_once_with(code=1013)


@pytest.mark.asyncio
async def test_socket_revocado_se_cierra_antes_del_siguiente_mensaje(monkeypatch):
    manager = NotificationConnectionManager()

    class ConexionFalsa:
        def __init__(self):
            self.send_text = AsyncMock()
            self.close = AsyncMock()

    conexion = ConexionFalsa()
    manager.active_connections = {"USR-1": [conexion]}
    manager.connection_session_hashes = {conexion: "hash-revocado"}
    monkeypatch.setattr(
        manager,
        "sesion_esta_activa",
        AsyncMock(return_value=False),
    )

    await manager._send_local_broadcast("USR-1", {"mensaje": "privado"})

    conexion.close.assert_awaited_once_with(code=1008)
    conexion.send_text.assert_not_awaited()
    assert "USR-1" not in manager.active_connections


@pytest.mark.asyncio
async def test_websocket_limita_conexiones_locales_por_usuario():
    manager = NotificationConnectionManager()
    manager.redis_client = RedisTicketsFalso()
    existentes = [SimpleNamespace() for _ in range(manager.max_connections_per_user)]
    manager.active_connections = {"USR-1": existentes}
    nueva = SimpleNamespace(accept=AsyncMock(), close=AsyncMock())

    conectada = await manager.connect(
        nueva,
        "USR-1",
        "hash-sesion",
        "notificaciones.v1",
    )

    assert conectada is False
    nueva.accept.assert_not_awaited()
    nueva.close.assert_awaited_once_with(code=1008)


@pytest.mark.asyncio
async def test_auditoria_sin_commit_participa_en_transaccion_externa():
    db = SimpleNamespace(
        execute=AsyncMock(),
        flush=AsyncMock(),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )

    await ServicioAuditoria.registrar_sin_commit(
        db,
        usuario_id="USR-1",
        modulo="bitacoras_operacionales",
        accion=AccionAuditoria.CREAR,
        metadatos={"bitacora_id": "BIT-1"},
    )

    db.execute.assert_awaited_once()
    db.flush.assert_awaited_once()
    db.commit.assert_not_awaited()
    db.rollback.assert_not_awaited()


def test_evento_manual_suprime_auditoria_automatica_duplicada():
    from app.core.middleware.auditoria_middleware import _debe_registrar_automaticamente

    request = SimpleNamespace(
        state=SimpleNamespace(auditoria_evento_manual=True),
    )

    assert _debe_registrar_automaticamente(request) is False


def test_correlacion_id_invalido_se_reemplaza_por_uuid():
    from app.core.middleware.auditoria_middleware import _resolver_correlacion_id

    request = SimpleNamespace(headers={"X-Request-ID": "no-es-un-uuid"})

    correlacion_id = _resolver_correlacion_id(request)

    assert str(UUID(correlacion_id)) == correlacion_id
    assert correlacion_id != "no-es-un-uuid"


def test_origen_websocket_exige_coincidencia_exacta(monkeypatch):
    from app.api.notificaciones.router import _origen_websocket_permitido

    monkeypatch.setattr(
        "app.services.notificacion.ws_security.config.frontend_url",
        "https://portal.example.com",
    )
    monkeypatch.setattr(
        "app.services.notificacion.ws_security.config.hostveremail",
        "https://cuenta.example.com",
    )

    assert _origen_websocket_permitido("https://portal.example.com") is True
    assert _origen_websocket_permitido("https://cuenta.example.com") is False
    assert _origen_websocket_permitido("https://portal.example.com.evil.test") is False
    assert _origen_websocket_permitido("") is False


def test_ticket_websocket_viaja_en_subprotocolo_y_no_en_query():
    from app.api.notificaciones.router import _extraer_ticket_subprotocolo

    subprotocolo, ticket = _extraer_ticket_subprotocolo(
        "notificaciones.v1, ticket.ticket-efimero-seguro"
    )

    assert subprotocolo == "notificaciones.v1"
    assert ticket == "ticket-efimero-seguro"
    assert _extraer_ticket_subprotocolo("notificaciones.v1") == (None, None)


def test_bitacoras_nunca_persisten_body_en_auditoria():
    from app.core.middleware.auditoria_middleware import _permite_auditar_body

    assert _permite_auditar_body("/api/v2/bitacoras-operacionales") is False
    assert _permite_auditar_body("/api/v2/bitacoras-operacionales/abc/finalizar") is False
    assert _permite_auditar_body("/api/v2/desarrollos/abc") is True
