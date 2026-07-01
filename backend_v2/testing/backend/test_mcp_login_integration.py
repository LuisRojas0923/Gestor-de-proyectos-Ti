"""
Test integration F5.6: flujo completo login → MCP token → tool → revocar → 401.

Cubre el caso end-to-end:
1. Login con cedula+password → token de sesion web
2. POST /auth/mcp-token con Bearer de sesion → token MCP
3. Llamar /auth/yo con el token MCP → 200 (identidad)
4. DELETE /auth/mcp-tokens/{jti} → 200 (revocar)
5. Re-llamar /auth/yo con el token MCP revocado → 401

Requiere backend en Docker en 127.0.0.1:8000. Si no, skip.

Pico RAM ~300MB (httpx + DB + backend en Docker).
"""
import os
from datetime import timedelta

import httpx
import pytest

from app.services.auth.servicio import ServicioAuth


BASE_URL = "http://127.0.0.1:8000/api/v2"
CEDULA_TEST = os.getenv("TEST_USER_CEDULA", "1107068093")
PASSWORD_TEST = os.getenv("TEST_USER_PASS")  # Puede ser None; los tests
# que la requieren hacen skip explicito.


@pytest.fixture
def backend_disponible():
    """Skip si el backend no responde."""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    if sock.connect_ex(("127.0.0.1", 8000)) != 0:
        sock.close()
        pytest.skip("Backend no disponible (requiere Docker compose up)")
    sock.close()


@pytest.fixture
def require_password():
    if not PASSWORD_TEST:
        pytest.skip(
            "TEST_USER_PASS no definida; no se puede hacer login real"
        )


class TestFlujoCompleto:
    """Login → emitir MCP token → usar → revocar → falla."""

    def test_login_emitir_usar_revocar_falla(
        self, backend_disponible, require_password
    ):
        """Happy path completo del flujo MCP."""
        with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
            # 1. Login
            r = c.post(
                "/auth/login",
                data={"username": CEDULA_TEST, "password": PASSWORD_TEST},
            )
            assert r.status_code == 200, f"Login fallo: {r.text[:200]}"
            session_token = r.json()["access_token"]
            assert session_token

            # 2. Emitir MCP token (anti-orfandad: usamos Bearer de sesion)
            r = c.post(
                "/auth/mcp-token",
                json={
                    "vigencia_dias": 1,
                    "scope": "read",
                    "motivo": "integration test",
                },
                headers={"Authorization": f"Bearer {session_token}"},
            )
            assert r.status_code == 200, f"Emitir MCP fallo: {r.text[:300]}"
            mcp = r.json()
            assert mcp.get("access_token")
            assert mcp.get("jti")
            assert mcp.get("scope") == "read"

            mcp_token = mcp["access_token"]
            mcp_jti = mcp["jti"]

            # 3. Usar el token MCP para llamar /auth/yo
            r = c.get(
                "/auth/yo",
                headers={"Authorization": f"Bearer {mcp_token}"},
            )
            assert r.status_code == 200, f"/auth/yo con MCP fallo: {r.text[:200]}"
            data = r.json()
            assert data.get("cedula") == CEDULA_TEST
            # El token_type debe marcarse como mcp
            # (esto se valida en otra parte; aqui solo confirmamos identidad)

            # 4. Revocar el token MCP
            r = c.delete(
                f"/auth/mcp-tokens/{mcp_jti}",
                headers={"Authorization": f"Bearer {session_token}"},
            )
            assert r.status_code == 200, f"Revocar fallo: {r.text[:200]}"

            # 5. Re-usar el token MCP revocado debe dar 401
            r = c.get(
                "/auth/yo",
                headers={"Authorization": f"Bearer {mcp_token}"},
            )
            assert r.status_code == 401, (
                f"Token revocado deberia ser 401, obtuvo {r.status_code}: {r.text[:200]}"
            )


class TestListarTokensMcp:
    """Verificar que /auth/mcp-tokens lista los tokens activos."""

    def test_listar_incluye_token_recien_emitido(
        self, backend_disponible, require_password
    ):
        with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
            # Login
            r = c.post(
                "/auth/login",
                data={"username": CEDULA_TEST, "password": PASSWORD_TEST},
            )
            assert r.status_code == 200
            session_token = r.json()["access_token"]

            # Limpiar tokens previos del usuario (best-effort)
            r = c.get(
                "/auth/mcp-tokens",
                headers={"Authorization": f"Bearer {session_token}"},
            )
            assert r.status_code == 200
            tokens_previos = r.json().get("tokens", [])

            # Emitir uno nuevo
            r = c.post(
                "/auth/mcp-token",
                json={"vigencia_dias": 1, "scope": "read", "motivo": "list test"},
                headers={"Authorization": f"Bearer {session_token}"},
            )
            assert r.status_code == 200
            nuevo_jti = r.json()["jti"]

            # Listar y verificar que esta el nuevo
            r = c.get(
                "/auth/mcp-tokens",
                headers={"Authorization": f"Bearer {session_token}"},
            )
            assert r.status_code == 200
            tokens = r.json().get("tokens", [])
            jtis = {t["jti"] for t in tokens}
            assert nuevo_jti in jtis, (
                f"jti {nuevo_jti} no aparece en la lista. Tokens: {jtis}"
            )

            # Cleanup: revocar el que acabamos de crear
            r = c.delete(
                f"/auth/mcp-tokens/{nuevo_jti}",
                headers={"Authorization": f"Bearer {session_token}"},
            )
            assert r.status_code == 200


class TestMcpTokenRechazaEndpointNoListado:
    """Un token MCP puede llamar endpoints que usen obtener_usuario_actual_db."""

    def test_token_mcp_puede_llamar_listar_desarrollos(self, backend_disponible, require_password):
        with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
            r = c.post(
                "/auth/login",
                data={"username": CEDULA_TEST, "password": PASSWORD_TEST},
            )
            assert r.status_code == 200
            session_token = r.json()["access_token"]

            r = c.post(
                "/auth/mcp-token",
                json={"vigencia_dias": 1, "scope": "read", "motivo": "desarrollos test"},
                headers={"Authorization": f"Bearer {session_token}"},
            )
            assert r.status_code == 200
            mcp_token = r.json()["access_token"]
            mcp_jti = r.json()["jti"]

            # Listar desarrollos con el token MCP
            r = c.get(
                "/desarrollos/?limit=2",
                headers={"Authorization": f"Bearer {mcp_token}"},
            )
            assert r.status_code == 200, (
                f"listar desarrollos con MCP fallo: {r.status_code} {r.text[:200]}"
            )
            data = r.json()
            assert isinstance(data, list)
            assert len(data) <= 2

            # Cleanup
            c.delete(
                f"/auth/mcp-tokens/{mcp_jti}",
                headers={"Authorization": f"Bearer {session_token}"},
            )
