"""
Test unit F5.8: anti-orfandad en /auth/mcp-token.

Cubre la mitigacion N2 del plan: un token MCP NO puede emitir otro token
MCP. Solo sesiones web (token_type='session') pueden emitir tokens MCP.
Esto evita que un leak de un solo token MCP permita encadenar infinitos
tokens sin intervencion del usuario.

Estrategia: llamar a la funcion HTTP /auth/mcp-token con un Bearer que
es un token MCP. Debe retornar 403 con mensaje claro.

Requiere backend en Docker (httpx al backend real). Si no, skip.
"""
from datetime import timedelta

import httpx
import pytest

from app.config import config
from app.services.auth.servicio import ServicioAuth


BASE_URL = "http://127.0.0.1:8000/api/v2"


def _emitir_token(tipo: str = "mcp", scope: str = "read") -> str:
    return ServicioAuth.crear_token_acceso(
        datos={"sub": "1107068093", "rol": "admin", "scope": scope},
        tiempo_expiracion=timedelta(hours=1),
        tipo_token=tipo,
    )


@pytest.fixture
def backend_disponible():
    """Skip el test si el backend no responde en 127.0.0.1:8000."""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    if sock.connect_ex(("127.0.0.1", 8000)) != 0:
        sock.close()
        pytest.skip("Backend no disponible en 127.0.0.1:8000 (requiere Docker compose up)")
    sock.close()


class TestAntiOrfandadTokenMcp:
    """Token MCP intentando emitir otro token MCP → 403."""

    def test_token_mcp_rechazado_con_403(self, backend_disponible):
        """El endpoint /auth/mcp-token debe rechazar un Bearer tipo mcp."""
        token_mcp = _emitir_token("mcp", "read")
        with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
            r = c.post(
                "/auth/mcp-token",
                json={"vigencia_dias": 7, "scope": "read", "motivo": "anti-orphan test"},
                headers={"Authorization": f"Bearer {token_mcp}"},
            )
        assert r.status_code == 403, (
            f"Esperado 403, obtuvo {r.status_code}: {r.text[:200]}"
        )
        # El mensaje debe ser claro
        detail = r.json().get("detail", "")
        assert "MCP" in detail.upper() or "orfandad" in detail.lower()

    def test_token_session_puede_emitir_mcp(self, backend_disponible):
        """El anti-orfandad NO debe bloquear tokens de sesion web."""
        # Necesitamos un token de sesion web valido. El plan sugiere loguearse
        # primero, pero para evitar la dependencia de password hardcodeada,
        # emitimos un token de sesion con el secreto y luego llamamos al endpoint.
        # Esto prueba que el endpoint acepta tokens 'session'.
        # (El test NO verifica que /auth/login funcione, solo que la
        # verificacion anti-orfandad distingue entre tipos.)
        token_session = _emitir_token("session", "read")
        with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
            r = c.post(
                "/auth/mcp-token",
                json={"vigencia_dias": 7, "scope": "read", "motivo": "test session ok"},
                headers={"Authorization": f"Bearer {token_session}"},
            )
        # El endpoint puede:
        # - 200: si el usuario existe en DB
        # - 401: si el jti no esta en sesiones (es un token sintetico)
        # - 400/404: si el usuario no existe
        # Lo que NO debe ser: 403 anti-orfandad
        assert r.status_code != 403, (
            f"Anti-orfandad rechazo un token de sesion: {r.text[:200]}"
        )


class TestAntiOrfandadSinToken:
    """Sin Bearer o con Bearer malformado, comportamiento esperado."""

    def test_sin_authorization_es_rechazado_401(self, backend_disponible):
        """Sin header Authorization, debe ser 401 (no 403 anti-orfandad)."""
        with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
            r = c.post(
                "/auth/mcp-token",
                json={"vigencia_dias": 7, "scope": "read"},
            )
        # Sin token → 401 (dependencia oauth2_scheme rechaza)
        assert r.status_code == 401, (
            f"Esperado 401, obtuvo {r.status_code}: {r.text[:200]}"
        )

    def test_token_basura_es_rechazado_401(self, backend_disponible):
        """Bearer con un JWT malformado → 401, no 403."""
        with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
            r = c.post(
                "/auth/mcp-token",
                json={"vigencia_dias": 7, "scope": "read"},
                headers={"Authorization": "Bearer basura.invalida.token"},
            )
        assert r.status_code == 401
