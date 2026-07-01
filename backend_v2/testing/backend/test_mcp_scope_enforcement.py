"""
Test unit F5.4: _check_scope en scripts/mcp/mcp_server.py.

Cubre la jerarquia read < write y el fail-closed:
- Token con scope=read NO puede llamar tools de write
- Token con scope=write SI puede llamar tools de write
- Token con scope desconocido → falla cerrado (rechaza)
- Token sin GPM_JWT_SECRET → PermissionError (no permite bypass)

Estrategia: importar mcp_server.py monkey-patcheando os.environ para
tener TOKEN + JWT_SECRET controlados. Pico RAM ~60MB.
"""
import importlib.util
import os
import sys
from datetime import timedelta
from pathlib import Path
from unittest import mock

import pytest
from jose import jwt

from app.config import config
from app.services.auth.servicio import ServicioAuth


MCP_SERVER = Path(__file__).resolve().parents[2] / "scripts" / "mcp" / "mcp_server.py"


def _cargar_mcp_server(token: str, secret: str | None):
    """Carga mcp_server.py con env vars controladas y devuelve el modulo."""
    saved = os.environ.copy()
    os.environ["GPM_TOKEN"] = token
    os.environ["GPM_TOKEN_NAME"] = "test_token"
    if secret is not None:
        os.environ["GPM_JWT_SECRET"] = secret
    else:
        os.environ.pop("GPM_JWT_SECRET", None)
    spec = importlib.util.spec_from_file_location("mcp_server_test", MCP_SERVER)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
        return mod
    finally:
        os.environ.clear()
        os.environ.update(saved)


def _emitir_token(scope: str) -> str:
    return ServicioAuth.crear_token_acceso(
        datos={"sub": "1107068093", "rol": "admin", "scope": scope},
        tiempo_expiracion=timedelta(hours=1),
        tipo_token="mcp",
    )


class TestCheckScope:
    """_check_scope rechaza tools con scope insuficiente al del token."""

    def test_read_token_puede_llamar_whoami(self):
        """whoami requiere read, token tiene read → OK."""
        token = _emitir_token("read")
        mod = _cargar_mcp_server(token, config.jwt_secret_key)
        # No debe lanzar
        mod._check_scope("whoami")

    def test_read_token_puede_llamar_listar_desarrollos(self):
        """listar_desarrollos requiere read, token tiene read → OK."""
        token = _emitir_token("read")
        mod = _cargar_mcp_server(token, config.jwt_secret_key)
        mod._check_scope("listar_desarrollos")

    def test_scope_insuficiente_rechaza_con_mensaje(self):
        """Token read intentando tool write → PermissionError claro."""
        token = _emitir_token("read")
        mod = _cargar_mcp_server(token, config.jwt_secret_key)
        # Inyectar tool sintetico de write
        with mock.patch.object(mod, "TOOL_SCOPE_REQUIRED", {
            "_test_write_tool": "write",
        }):
            with pytest.raises(PermissionError) as excinfo:
                mod._check_scope("_test_write_tool")
        msg = str(excinfo.value)
        assert "_test_write_tool" in msg
        assert "write" in msg
        assert "read" in msg

    def test_write_token_puede_llamar_write_tool(self):
        """Token write tiene scope suficiente para tool write."""
        token = _emitir_token("write")
        mod = _cargar_mcp_server(token, config.jwt_secret_key)
        with mock.patch.object(mod, "TOOL_SCOPE_REQUIRED", {
            "_test_write_tool": "write",
        }):
            mod._check_scope("_test_write_tool")  # No debe lanzar

    def test_write_token_puede_llamar_read_tool(self):
        """Token write también puede llamar tools de read (jerarquía)."""
        token = _emitir_token("write")
        mod = _cargar_mcp_server(token, config.jwt_secret_key)
        mod._check_scope("whoami")
        mod._check_scope("listar_desarrollos")

    def test_scope_desconocido_falla_cerrado(self):
        """Token con scope='admin' (no en jerarquía) → rechazado."""
        token = _emitir_token("admin")
        mod = _cargar_mcp_server(token, config.jwt_secret_key)
        with pytest.raises(PermissionError) as excinfo:
            mod._check_scope("whoami")
        assert "admin" in str(excinfo.value)

    def test_sin_secreto_falla_cerrado(self):
        """Sin GPM_JWT_SECRET no se puede verificar firma → PermissionError."""
        token = _emitir_token("read")
        mod = _cargar_mcp_server(token, secret=None)
        with pytest.raises(PermissionError) as excinfo:
            mod._check_scope("whoami")
        assert "GPM_JWT_SECRET" in str(excinfo.value)

    def test_firma_invalida_rechazada(self):
        """Token firmado con OTRO secreto → PermissionError (no bypass)."""
        # Firmamos con un secreto distinto
        token_firmado_otro = jwt.encode(
            {"sub": "x", "rol": "admin", "scope": "write",
             "token_type": "mcp", "jti": "fake"},
            "secreto-atacante-no-es-el-real",
            algorithm="HS256",
        )
        mod = _cargar_mcp_server(token_firmado_otro, config.jwt_secret_key)
        with pytest.raises(PermissionError) as excinfo:
            mod._check_scope("whoami")
        # Cualquier intento de scope o firma debe fallar
        assert "Firma" in str(excinfo.value) or "invalida" in str(excinfo.value).lower()


class TestToolScopeRequired:
    """TOOL_SCOPE_REQUIRED debe declarar scope para todos los tools expuestos."""

    def test_todos_los_tools_tienen_scope_declarado(self):
        """Cobertura: para cada tool en TOOLS, debe existir en TOOL_SCOPE_REQUIRED."""
        mod = _cargar_mcp_server(_emitir_token("read"), config.jwt_secret_key)
        tools_registrados = set(mod.TOOLS.keys())
        scopes_declarados = set(mod.TOOL_SCOPE_REQUIRED.keys())
        # La interseccion debe ser exactamente los tools registrados
        # (puede haber scopes para tools no implementados, pero no al reves)
        for tool in tools_registrados:
            assert tool in scopes_declarados, (
                f"Tool '{tool}' no tiene scope declarado en TOOL_SCOPE_REQUIRED"
            )

    def test_solo_scopes_validos_en_declaracion(self):
        """Los scopes declarados deben ser 'read' o 'write' (jerarquía conocida)."""
        mod = _cargar_mcp_server(_emitir_token("read"), config.jwt_secret_key)
        for tool, scope in mod.TOOL_SCOPE_REQUIRED.items():
            assert scope in ("read", "write"), (
                f"Tool '{tool}' tiene scope invalido: '{scope}'"
            )
