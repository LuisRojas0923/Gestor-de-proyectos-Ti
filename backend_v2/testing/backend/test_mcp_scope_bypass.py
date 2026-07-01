"""
Test unit F5.7: bypass de scope por modificacion de JWT sin firma.

Cubre la mitigacion N1 del plan (seccion 8): un atacante que intercepte
un token con scope='read' no puede elevarlo a 'write' modificando el
payload porque el servidor MCP verifica la firma con GPM_JWT_SECRET.

Estrategia:
- Crear un token con scope='read' firmado con el secreto real
- Modificar el payload a scope='write' SIN re-firmar
- Verificar que _get_token_scope rechaza con PermissionError

Tambien cubre el caso de un token que dice token_type='session' siendo
en realidad un token MCP (o viceversa) — el servidor MCP debe detectar
la inconsistencia via firma.

NO requiere Docker, DB. Pico RAM ~60MB.
"""
import importlib.util
import os
import base64
import json
from datetime import timedelta
from pathlib import Path

import pytest
from jose import jwt

from app.config import config
from app.services.auth.servicio import ServicioAuth


MCP_SERVER = Path(__file__).resolve().parents[2] / "scripts" / "mcp" / "mcp_server.py"


def _cargar_modulo(token: str, secret: str):
    saved = os.environ.copy()
    os.environ["GPM_TOKEN"] = token
    os.environ["GPM_TOKEN_NAME"] = "test_bypass"
    os.environ["GPM_JWT_SECRET"] = secret
    spec = importlib.util.spec_from_file_location("mcp_server_test_bypass", MCP_SERVER)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    os.environ.clear()
    os.environ.update(saved)
    return mod


def _modificar_payload_jwt(token: str, cambios: dict) -> str:
    """Decodifica un JWT, modifica campos, lo re-empaqueta SIN firmar.

    El resultado es un JWT con la firma original (invalida) y el payload nuevo.
    """
    header_b64, payload_b64, firma_b64 = token.split(".")
    # Decodificar payload (puede tener padding faltante)
    padding = 4 - (len(payload_b64) % 4)
    if padding != 4:
        payload_b64 += "=" * padding
    payload = json.loads(base64.urlsafe_b64decode(payload_b64))
    payload.update(cambios)
    # Re-empaquetar
    payload_nuevo = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode()
    ).rstrip(b"=").decode()
    return f"{header_b64}.{payload_nuevo}.{firma_b64}"


class TestScopeBypass:
    """Modificar scope en el payload JWT debe ser rechazado por firma invalida."""

    def test_elevar_read_a_write_es_rechazado(self):
        """El caso clasico de privilege escalation: cambiar scope a write."""
        token_legitimo = ServicioAuth.crear_token_acceso(
            datos={"sub": "1107068093", "rol": "admin", "scope": "read"},
            tiempo_expiracion=timedelta(hours=1),
            tipo_token="mcp",
        )
        token_tampered = _modificar_payload_jwt(token_legitimo, {"scope": "write"})

        mod = _cargar_modulo(token_tampered, config.jwt_secret_key)
        with pytest.raises(PermissionError) as excinfo:
            mod._get_token_scope()
        # El mensaje debe mencionar la firma invalida
        msg = str(excinfo.value).lower()
        assert "firma" in msg or "invalida" in msg or "invalid" in msg

    def test_cambiar_token_type_a_session_es_rechazado(self):
        """Si el atacante cambia token_type='mcp' a 'session' para evadir
        la validacion de jti, la firma invalida lo delata."""
        token_legitimo = ServicioAuth.crear_token_acceso(
            datos={"sub": "1107068093", "rol": "admin", "scope": "read"},
            tiempo_expiracion=timedelta(hours=1),
            tipo_token="mcp",
        )
        token_tampered = _modificar_payload_jwt(token_legitimo, {"token_type": "session"})

        mod = _cargar_modulo(token_tampered, config.jwt_secret_key)
        with pytest.raises(PermissionError):
            mod._get_token_scope()

    def test_cambiar_rol_a_admin_es_rechazado(self):
        """Modificar el rol del payload no debe funcionar."""
        token_legitimo = ServicioAuth.crear_token_acceso(
            datos={"sub": "1107068093", "rol": "usuario", "scope": "read"},
            tiempo_expiracion=timedelta(hours=1),
            tipo_token="mcp",
        )
        token_tampered = _modificar_payload_jwt(token_legitimo, {"rol": "admin"})

        mod = _cargar_modulo(token_tampered, config.jwt_secret_key)
        with pytest.raises(PermissionError):
            mod._get_token_scope()

    def test_token_firmado_con_secreto_atacante_rechazado(self):
        """Un atacante que firma con su propio secreto (no el del backend) es rechazado."""
        token_atacante = jwt.encode(
            {
                "sub": "atacante",
                "rol": "admin",
                "scope": "write",
                "token_type": "mcp",
                "jti": "fake-jti",
            },
            "secreto-del-atacante-que-no-es-el-real",
            algorithm="HS256",
        )
        mod = _cargar_modulo(token_atacante, config.jwt_secret_key)
        with pytest.raises(PermissionError):
            mod._get_token_scope()

    def test_token_con_algoritmo_none_rechazado(self):
        """Token con 'alg: none' (ataque clasico) no debe pasar."""
        # Crear un JWT con alg=none
        header = base64.urlsafe_b64encode(
            json.dumps({"alg": "none", "typ": "JWT"}).encode()
        ).rstrip(b"=").decode()
        payload = base64.urlsafe_b64encode(
            json.dumps({
                "sub": "atacante", "rol": "admin", "scope": "write",
                "token_type": "mcp", "jti": "fake",
            }).encode()
        ).rstrip(b"=").decode()
        token_none = f"{header}.{payload}."

        mod = _cargar_modulo(token_none, config.jwt_secret_key)
        with pytest.raises(PermissionError):
            mod._get_token_scope()


class TestTokenLegitimoPasa:
    """Sanity check: tokens bien formados NO son rechazados."""

    def test_token_read_valido_pasa_scope_check(self):
        token = ServicioAuth.crear_token_acceso(
            datos={"sub": "1107068093", "rol": "admin", "scope": "read"},
            tiempo_expiracion=timedelta(hours=1),
            tipo_token="mcp",
        )
        mod = _cargar_modulo(token, config.jwt_secret_key)
        assert mod._get_token_scope() == "read"

    def test_token_write_valido_pasa_scope_check(self):
        token = ServicioAuth.crear_token_acceso(
            datos={"sub": "1107068093", "rol": "admin", "scope": "write"},
            tiempo_expiracion=timedelta(hours=1),
            tipo_token="mcp",
        )
        mod = _cargar_modulo(token, config.jwt_secret_key)
        assert mod._get_token_scope() == "write"
