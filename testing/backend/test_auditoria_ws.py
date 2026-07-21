import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect

from app.main import app
from unittest.mock import patch, AsyncMock, MagicMock
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth
from datetime import datetime, timedelta

def test_websocket_auditoria_dashboard_sin_token():
    client = TestClient(app)
    with pytest.raises(Exception):
        with client.websocket_connect("/api/v2/auditoria/ws/dashboard") as websocket:
            pass

def test_websocket_con_token_invalido():
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/v2/auditoria/ws/dashboard", subprotocols=["invalido123"]) as websocket:
            websocket.receive_text()
    assert exc_info.value.code == 1008

@pytest.mark.asyncio
async def test_validar_token_ws_mcp_revocado():
    mock_db = AsyncMock()
    # Simular token MCP pero sesión no existe
    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "mcp", "jti": "jti-1"}):
        # mock db.execute().scalars().first() to return None
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = mock_result

        usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token")
        assert usuario is None
        assert "revocad" in error.lower()

@pytest.mark.asyncio
async def test_validar_token_ws_usuario_inactivo():
    mock_db = AsyncMock()
    from app.models.auth.usuario import Sesion
    from app.utils_date import get_bogota_now
    sesion = Sesion(jti="abc", fin_sesion=None, expira_en=get_bogota_now() + timedelta(days=1))

    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "session", "jti": "abc"}):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = sesion
        mock_db.execute.return_value = mock_result
        with patch.object(ServicioAuth, 'obtener_usuario_por_cedula', return_value=Usuario(cedula="123", esta_activo=False)):
            usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token")
            assert usuario is None
            assert error == "Usuario inactivo"

@pytest.mark.asyncio
async def test_validar_token_ws_sin_permiso():
    mock_db = AsyncMock()
    from app.models.auth.usuario import Sesion
    from app.utils_date import get_bogota_now
    sesion = Sesion(jti="abc", fin_sesion=None, expira_en=get_bogota_now() + timedelta(days=1))

    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "session", "jti": "abc"}):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = sesion
        mock_db.execute.return_value = mock_result
        with patch.object(ServicioAuth, 'obtener_usuario_por_cedula', return_value=Usuario(cedula="123", esta_activo=True, rol="invitado")):
            with patch.object(ServicioAuth, 'obtener_permisos_por_rol', return_value=["otro_modulo"]):
                usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token", modulo_requerido="auditoria_sistema")
                assert usuario is None
                assert "Sin permiso" in error

@pytest.mark.asyncio
async def test_validar_token_ws_conexion_valida():
    mock_db = AsyncMock()
    from app.models.auth.usuario import Sesion
    from app.utils_date import get_bogota_now
    sesion = Sesion(jti="abc", fin_sesion=None, expira_en=get_bogota_now() + timedelta(days=1))

    test_user = Usuario(cedula="123", esta_activo=True, rol="admin")
    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "session", "jti": "abc"}):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = sesion
        mock_db.execute.return_value = mock_result
        with patch.object(ServicioAuth, 'obtener_usuario_por_cedula', return_value=test_user):
            with patch.object(ServicioAuth, 'obtener_permisos_por_rol', return_value=["auditoria_sistema"]):
                usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token", modulo_requerido="auditoria_sistema")
                assert usuario == test_user
                assert error is None

@patch("app.api.auditoria.router.ServicioAuth.validar_token_ws")
def test_websocket_integracion_acepta(mock_validar):
    # Simulamos que la validacion pasa
    mock_validar.return_value = (Usuario(cedula="123", esta_activo=True, rol="admin"), None)
    client = TestClient(app)
    with client.websocket_connect("/api/v2/auditoria/ws/dashboard", headers={"origin": "http://localhost:5173"}, subprotocols=["auth", "token_valido"]) as websocket:
        assert True

@patch("app.api.auditoria.router.ServicioAuth.validar_token_ws")
@patch("app.api.auditoria.router.AsyncSessionLocal")
def test_websocket_auditoria_libera_conexion_db(mock_session_local, mock_validar):
    # Simulamos que la validación pasa
    mock_validar.return_value = (Usuario(cedula="123", esta_activo=True, rol="admin"), None)

    # Mockear el async context manager
    mock_db = AsyncMock()
    mock_session_local.return_value.__aenter__.return_value = mock_db

    client = TestClient(app)
    with client.websocket_connect("/api/v2/auditoria/ws/dashboard", headers={"origin": "http://localhost:5173"}, subprotocols=["auth", "token_valido"]) as websocket:
        # En este punto el socket está abierto y esperando.
        # La conexión de BD ya debería haberse cerrado (devuelta al pool).
        mock_session_local.return_value.__aexit__.assert_called_once()

@pytest.mark.asyncio
async def test_validar_token_ws_tipo_invalido():
    mock_db = AsyncMock()
    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "invalido"}):
        usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token")
        assert usuario is None
        assert "no permitido" in error.lower() or "inválido" in error.lower()

@pytest.mark.asyncio
async def test_validar_token_ws_sin_jti():
    mock_db = AsyncMock()
    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "session"}): # Sin jti
        usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token")
        assert usuario is None
        assert "jti" in error.lower()

@pytest.mark.asyncio
async def test_validar_token_ws_sesion_cerrada():
    mock_db = AsyncMock()
    from app.models.auth.usuario import Sesion
    from app.utils_date import get_bogota_now
    sesion = Sesion(jti="abc", fin_sesion=get_bogota_now(), expira_en=get_bogota_now() + timedelta(days=1))

    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "session", "jti": "abc"}):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = sesion
        mock_db.execute.return_value = mock_result
        usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token")
        assert usuario is None
        assert "revocada" in error.lower() or "expirada" in error.lower()

@pytest.mark.asyncio
async def test_validar_token_ws_mcp_expirado():
    mock_db = AsyncMock()
    from app.models.auth.usuario import Sesion
    from app.utils_date import get_bogota_now
    sesion = Sesion(jti="abc", fin_sesion=None, expira_en=get_bogota_now() - timedelta(days=1))

    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "mcp", "jti": "abc"}):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = sesion
        mock_db.execute.return_value = mock_result
        usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token")
        assert usuario is None
        assert "expirad" in error.lower() or "revocad" in error.lower()

@pytest.mark.asyncio
async def test_validar_token_ws_mcp_activo():
    mock_db = AsyncMock()
    from app.models.auth.usuario import Sesion
    from app.utils_date import get_bogota_now
    sesion = Sesion(jti="abc", fin_sesion=None, expira_en=get_bogota_now() + timedelta(days=1))
    test_user = Usuario(cedula="123", esta_activo=True, rol="admin")

    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "mcp", "jti": "abc"}):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = sesion
        mock_db.execute.return_value = mock_result
        with patch.object(ServicioAuth, 'obtener_usuario_por_cedula', return_value=test_user):
            usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token")
            assert usuario == test_user
            assert error is None

@patch("app.api.auditoria.router.ServicioAuth.validar_token_ws")
def test_websocket_origen_invalido(mock_validar):
    mock_validar.return_value = (Usuario(cedula="123", esta_activo=True, rol="admin"), None)
    client = TestClient(app)
    # Origin no permitido
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/v2/auditoria/ws/dashboard", headers={"origin": "http://hacker.com"}, subprotocols=["auth", "token_valido"]) as websocket:
            websocket.receive_text()
    assert exc_info.value.code == 1008

@patch("app.api.auditoria.router.ServicioAuth.validar_token_ws")
@patch("app.api.auditoria.router.AsyncSessionLocal")
def test_websocket_origen_valido(mock_session_local, mock_validar):
    mock_validar.return_value = (Usuario(cedula="123", esta_activo=True, rol="admin"), None)
    mock_db = MagicMock()
    mock_session_local.return_value.__aenter__.return_value = mock_db

    client = TestClient(app)
    # Origin permitido
    with client.websocket_connect("/api/v2/auditoria/ws/dashboard", headers={"origin": "http://localhost:5173"}, subprotocols=["auth", "token_valido"]) as websocket:
        assert websocket.accepted_subprotocol == "auth"

@pytest.mark.asyncio
async def test_auditoria_ws_manager_limite():
    from app.services.auditoria.ws_manager import AuditoriaWSManager
    from fastapi import WebSocket

    manager = AuditoriaWSManager(max_connections=2)
    mock_ws1 = AsyncMock(spec=WebSocket)
    mock_ws2 = AsyncMock(spec=WebSocket)
    mock_ws3 = AsyncMock(spec=WebSocket)

    assert await manager.connect(mock_ws1) is True
    assert await manager.connect(mock_ws2) is True
    assert await manager.connect(mock_ws3) is False  # Limite alcanzado

    await manager.shutdown()

@pytest.mark.asyncio
async def test_auditoria_ws_manager_coalescing():
    from app.services.auditoria.ws_manager import AuditoriaWSManager
    from fastapi import WebSocket
    import asyncio

    manager = AuditoriaWSManager()
    mock_ws = AsyncMock(spec=WebSocket)

    await manager.connect(mock_ws)

    # Ráfaga de notificaciones
    for _ in range(10):
        manager.notify_update()

    # La cola tiene tamaño máximo 2
    assert manager.queues[mock_ws].qsize() <= 2

    await manager.shutdown()

@pytest.mark.asyncio
async def test_auditoria_ws_manager_shutdown():
    from app.services.auditoria.ws_manager import AuditoriaWSManager
    from fastapi import WebSocket

    manager = AuditoriaWSManager()
    mock_ws = AsyncMock(spec=WebSocket)
    await manager.connect(mock_ws)

    task = manager.active_connections[mock_ws]
    assert not task.cancelled()

    await manager.shutdown()
    assert mock_ws not in manager.active_connections
    import asyncio
    await asyncio.sleep(0.01) # Yield to event loop to let cancellation propagate
    assert task.cancelled()


@pytest.mark.asyncio
async def test_auditoria_ws_login_y_refresh_flow(client):
    """
    E2E test: Real login -> checks JWT jti matches DB Session jti -> refresh token -> checks rotation -> connect WS.
    """
    import os
    from jose import jwt
    from sqlmodel import select
    from app.database import AsyncSessionLocal
    from app.models.auth.usuario import Sesion
    from app.core.config import obtener_configuracion
    from fastapi.testclient import TestClient
    from app.main import app

    cfg = obtener_configuracion()
    user_cedula = os.getenv("TEST_USER_CEDULA", "1107068093")
    user_pass = os.getenv("TEST_USER_PASS", "1107068093")

    # 1. Login
    response = await client.post("/auth/login", data={"username": user_cedula, "password": user_pass})
    if response.status_code != 200:
        pytest.skip(f"No se pudo hacer login para el test E2E: {response.text}")
    
    data = response.json()
    if "access_token" not in data:
        pytest.skip(f"Login no retornó access_token: {data}")
        
    token = data["access_token"]

    # 2. Extract jti de token usando la configuración central
    payload = jwt.decode(token, cfg.jwt_secret_key, algorithms=[cfg.algorithm])
    token_jti = payload.get("jti")
    assert token_jti is not None, "JWT de login debe contener un jti validable"

    # 3. Verificar que la sesión SÍ se persistió en la BD con ese JTI
    async with AsyncSessionLocal() as db:
        stmt = select(Sesion).where(Sesion.jti == token_jti)
        result = await db.execute(stmt)
        sesion_db = result.scalars().first()

    assert sesion_db is not None, "La sesión DEBE existir en la base de datos tras el login"
    assert sesion_db.jti == token_jti, f"El JTI en BD ({sesion_db.jti}) debe coincidir con el token ({token_jti})"

    # 4. Probar Refresh Token (rotación de JTI y sesión)
    ref_res = await client.post("/auth/refresh", headers={"Authorization": f"Bearer {token}"})
    assert ref_res.status_code == 200, f"Refresh debe ser exitoso: {ref_res.text}"
    nuevo_token = ref_res.json()["access_token"]

    payload_ref = jwt.decode(nuevo_token, cfg.jwt_secret_key, algorithms=[cfg.algorithm])
    nuevo_jti = payload_ref.get("jti")
    assert nuevo_jti is not None and nuevo_jti != token_jti, "El nuevo JWT tras refresh debe tener un nuevo JTI"

    # 5. Verificar que la sesión en la BD fue rotada exitosamente al nuevo JTI
    async with AsyncSessionLocal() as db:
        stmt_ref = select(Sesion).where(Sesion.jti == nuevo_jti)
        result_ref = await db.execute(stmt_ref)
        sesion_rotada = result_ref.scalars().first()

    assert sesion_rotada is not None, "La sesión rotada con el nuevo JTI debe persistirse en BD"

    # 6. Conectar al WebSocket con el token refrescado y verificar aceptación
    sync_client = TestClient(app)
    ws_url = f"/api/v2/auditoria/ws/dashboard?token={nuevo_token}"
    with sync_client.websocket_connect(ws_url, headers={"Origin": "http://localhost:5173"}) as websocket:
        assert True


def test_config_entorno_coercion_y_aliases():
    from app.core.config import Settings

    s1 = Settings(_env_file=None, entorno="production")
    assert s1.entorno == "produccion"
    assert s1.es_produccion is True

    s2 = Settings(_env_file=None, entorno="desarrollo")
    assert s2.entorno == "desarrollo"
    assert s2.es_produccion is False

    s3 = Settings(_env_file=None, entorno="testing")
    assert s3.entorno == "tests"
    assert s3.es_produccion is False


def test_politica_origin_produccion_falla_cerrada():
    from app.core.config import Settings
    from app.api.auditoria.router import origin_valido

    # Producción sin orígenes configurados explícitamente -> falla cerrada (rechaza todo)
    prod_config = Settings(entorno="produccion", ws_origenes_permitidos="")
    with patch("app.api.auditoria.router.obtener_configuracion", return_value=prod_config):
        assert origin_valido("http://localhost:5173") is False
        assert origin_valido("http://127.0.0.1:5173") is False
        assert origin_valido("https://empresa.com") is False

    # Producción con origen explícito
    prod_config_allowed = Settings(entorno="produccion", ws_origenes_permitidos="https://empresa.com,https://servicios.empresa.com")
    with patch("app.api.auditoria.router.obtener_configuracion", return_value=prod_config_allowed):
        assert origin_valido("https://empresa.com") is True
        assert origin_valido("https://servicios.empresa.com") is True
        assert origin_valido("http://localhost:5173") is False

    # Desarrollo por defecto permite localhost
    dev_config = Settings(entorno="desarrollo", ws_origenes_permitidos="")
    with patch("app.api.auditoria.router.obtener_configuracion", return_value=dev_config):
        assert origin_valido("http://localhost:5173") is True
        assert origin_valido("http://127.0.0.1:5173") is True
        assert origin_valido("http://hacker.com") is False
