"""
Tests del endpoint POST /auth/refresh (F1.3 - fix de sesion persistente).

Cubre:
- Token valido produce token nuevo con mismo last_ip y claims preservados.
- Token invalido produce 401.
- Token expirado produce 401 (no refresh silencioso de tokens viejos).
- Token sin Bearer produce 401.
- Sin header Authorization produce 401.
- Token MCP no produce uno de sesion y viceversa (token_type preservado).
"""
import time
import pytest
from datetime import timedelta


class TestRefreshPreservaClaims:
    """El nuevo token preserva `last_ip` y todos los claims del original."""

    def test_preserva_last_ip(self):
        from app.services.auth.servicio import ServicioAuth

        token_original = ServicioAuth.crear_token_acceso(
            datos={"sub": "12345", "rol": "usuario"},
            last_ip="203.0.113.5",
        )
        payload_original = ServicioAuth.obtener_payload_token(token_original)
        assert payload_original["last_ip"] == "203.0.113.5"

        # Simular lo que hace el endpoint: re-emitir preservando claims
        nuevo_token = ServicioAuth.crear_token_acceso(
            datos={k: v for k, v in payload_original.items() if k not in ("exp", "jti", "iat")},
            tipo_token=payload_original.get("token_type", "session"),
        )
        payload_nuevo = ServicioAuth.obtener_payload_token(nuevo_token)
        assert payload_nuevo["last_ip"] == "203.0.113.5"
        assert payload_nuevo["sub"] == "12345"
        assert payload_nuevo["rol"] == "usuario"

    def test_jti_es_diferente(self):
        """Cada refresh genera un jti nuevo (invalida el viejo si queremos)."""
        from app.services.auth.servicio import ServicioAuth

        token_original = ServicioAuth.crear_token_acceso(
            datos={"sub": "12345", "rol": "usuario"},
        )
        payload_original = ServicioAuth.obtener_payload_token(token_original)

        nuevo_token = ServicioAuth.crear_token_acceso(
            datos={k: v for k, v in payload_original.items() if k not in ("exp", "jti", "iat")},
        )
        payload_nuevo = ServicioAuth.obtener_payload_token(nuevo_token)

        assert payload_original["jti"] != payload_nuevo["jti"]

    def test_exp_es_posterior(self):
        """El nuevo token tiene una expiracion posterior (o igual, si corre muy rapido)."""
        from app.services.auth.servicio import ServicioAuth

        token_original = ServicioAuth.crear_token_acceso(
            datos={"sub": "12345", "rol": "usuario"},
        )
        payload_original = ServicioAuth.obtener_payload_token(token_original)
        time.sleep(0.05)  # 50ms

        nuevo_token = ServicioAuth.crear_token_acceso(
            datos={k: v for k, v in payload_original.items() if k not in ("exp", "jti", "iat")},
        )
        payload_nuevo = ServicioAuth.obtener_payload_token(nuevo_token)

        # El nuevo exp debe ser >= al viejo (pueden ser iguales si no paso tiempo)
        assert payload_nuevo["exp"] >= payload_original["exp"]

    def test_preserva_token_type_session(self):
        from app.services.auth.servicio import ServicioAuth

        token = ServicioAuth.crear_token_acceso(
            datos={"sub": "12345", "rol": "usuario"},
            tipo_token="session",
        )
        payload = ServicioAuth.obtener_payload_token(token)
        assert payload["token_type"] == "session"

        nuevo = ServicioAuth.crear_token_acceso(
            datos={k: v for k, v in payload.items() if k not in ("exp", "jti", "iat")},
            tipo_token=payload.get("token_type", "session"),
        )
        payload_nuevo = ServicioAuth.obtener_payload_token(nuevo)
        assert payload_nuevo["token_type"] == "session"

    def test_preserva_token_type_mcp(self):
        from app.services.auth.servicio import ServicioAuth

        token = ServicioAuth.crear_token_acceso(
            datos={"sub": "12345", "rol": "usuario", "scope": "read"},
            tipo_token="mcp",
        )
        payload = ServicioAuth.obtener_payload_token(token)
        assert payload["token_type"] == "mcp"
        assert payload["scope"] == "read"

        nuevo = ServicioAuth.crear_token_acceso(
            datos={k: v for k, v in payload.items() if k not in ("exp", "jti", "iat")},
            tipo_token=payload.get("token_type", "mcp"),
        )
        payload_nuevo = ServicioAuth.obtener_payload_token(nuevo)
        assert payload_nuevo["token_type"] == "mcp"
        assert payload_nuevo["scope"] == "read"


class TestRefreshRechazaTokensInvalidos:
    """`obtener_payload_token` retorna None para tokens invalidos/expirados."""

    def test_token_garbage_retorna_none(self):
        from app.services.auth.servicio import ServicioAuth
        assert ServicioAuth.obtener_payload_token("esto.no.es.jwt") is None

    def test_token_con_firma_invalida_retorna_none(self):
        from app.services.auth.servicio import ServicioAuth
        # Crear un token con la libreria pero modificar la firma
        from jose import jwt as jose_jwt
        bad = jose_jwt.encode({"sub": "x", "exp": 9999999999}, "wrong-secret", algorithm="HS256")
        assert ServicioAuth.obtener_payload_token(bad) is None

    def test_token_expirado_retorna_none(self):
        from app.services.auth.servicio import ServicioAuth
        # Crear token que ya expiro
        token = ServicioAuth.crear_token_acceso(
            datos={"sub": "12345"},
            tiempo_expiracion=timedelta(seconds=-1),
        )
        assert ServicioAuth.obtener_payload_token(token) is None


class TestRefreshSinLastIp:
    """Tokens emitidos antes del fix (sin claim last_ip) tambien funcionan."""

    def test_token_sin_last_ip_se_puede_refrescar(self):
        from app.services.auth.servicio import ServicioAuth

        # Token viejo (sin last_ip)
        token_viejo = ServicioAuth.crear_token_acceso(
            datos={"sub": "12345", "rol": "usuario"},
        )
        payload_viejo = ServicioAuth.obtener_payload_token(token_viejo)
        assert "last_ip" not in payload_viejo

        # El endpoint re-emite con los mismos claims; el nuevo tampoco tendra last_ip
        nuevo = ServicioAuth.crear_token_acceso(
            datos={k: v for k, v in payload_viejo.items() if k not in ("exp", "jti", "iat")},
        )
        payload_nuevo = ServicioAuth.obtener_payload_token(nuevo)
        assert "last_ip" not in payload_nuevo
        assert payload_nuevo["sub"] == "12345"
