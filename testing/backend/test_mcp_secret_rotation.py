"""
Test unit F5.9: rotacion de JWT_SECRET_KEY invalida tokens viejos.

Cubre el procedimiento documentado en docs/PLAN_SERVIDOR_MCP.md:
cuando se rota JWT_SECRET_KEY, los tokens emitidos con el secreto viejo
deben ser rechazados aunque la firma siga siendo 'valida' con ese secreto
viejo. Esto cierra el riesgo de que un atacante que conozca el secreto
anterior pueda seguir emitiendo tokens indefinidamente.

Estrategia:
- Emitir un token con el secreto actual
- Cambiar config.jwt_secret_key a otro valor
- Verificar que el token viejo ahora se rechaza (firma invalida)

NO requiere Docker, DB. Pico RAM ~60MB.
"""
import importlib.util
import os
from datetime import timedelta
from pathlib import Path
from unittest import mock

import pytest
from jose import jwt

from app.config import config
from app.services.auth.servicio import ServicioAuth


MCP_SERVER = Path(__file__).resolve().parents[2] / "scripts" / "mcp" / "mcp_server.py"


class TestRotacionSecretoJwt:
    """Tras rotar JWT_SECRET_KEY, tokens viejos son invalidos."""

    def test_token_viejo_rechazado_tras_rotacion(self):
        """Token firmado con secreto A, verificado con secreto B → falla."""
        # 1. Emitir token con secreto actual
        secreto_viejo = "secreto-anterior-que-fue-rotado-32-bytes-minimo"
        token_viejo = jwt.encode(
            {
                "sub": "1107068093",
                "rol": "admin",
                "scope": "read",
                "token_type": "mcp",
                "jti": "fake-jti-rotacion",
            },
            secreto_viejo,
            algorithm="HS256",
        )

        # 2. Intentar verificar con el secreto NUEVO (config.jwt_secret_key)
        with pytest.raises(Exception) as excinfo:
            jwt.decode(
                token_viejo,
                config.jwt_secret_key,  # el nuevo
                algorithms=["HS256"],
            )
        # jose lanza jwt.JWTError o jose.exceptions.JWTError
        assert "signature" in str(excinfo.value).lower() or "verification" in str(excinfo.value).lower()

    def test_token_nuevo_aceptado_despues_de_rotacion(self):
        """Token emitido con el secreto actual debe verificar OK."""
        token_nuevo = ServicioAuth.crear_token_acceso(
            datos={"sub": "1107068093", "rol": "admin", "scope": "read"},
            tiempo_expiracion=timedelta(hours=1),
            tipo_token="mcp",
        )
        payload = jwt.decode(
            token_nuevo,
            config.jwt_secret_key,
            algorithms=[config.algorithm],
        )
        assert payload["sub"] == "1107068093"
        assert payload["token_type"] == "mcp"

    def test_mcp_server_rechaza_token_viejo_tras_rotacion(self):
        """El mcp_server._get_token_scope debe rechazar tokens con secreto viejo."""
        secreto_viejo = "secreto-anterior-32-bytes-para-test-de-rotacion-x"
        token_viejo = jwt.encode(
            {
                "sub": "1107068093",
                "rol": "admin",
                "scope": "write",  # ambitioso: el atacante quiere write
                "token_type": "mcp",
                "jti": "jti-viejo",
            },
            secreto_viejo,
            algorithm="HS256",
        )

        # Cargar mcp_server con el secreto NUEVO (config.jwt_secret_key)
        saved = os.environ.copy()
        os.environ["GPM_TOKEN"] = token_viejo
        os.environ["GPM_TOKEN_NAME"] = "test_rotacion"
        os.environ["GPM_JWT_SECRET"] = config.jwt_secret_key
        try:
            spec = importlib.util.spec_from_file_location(
                "mcp_server_test_rot", MCP_SERVER
            )
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            with pytest.raises(PermissionError):
                mod._get_token_scope()
        finally:
            os.environ.clear()
            os.environ.update(saved)


class TestValidarTokenSesion:
    """El validador de tokens de sesion tambien debe respetar la rotacion."""

    def test_obtener_cedula_desde_token_con_secreto_viejo_retorna_none(self):
        """Un token firmado con secreto viejo no debe decodificar con el nuevo."""
        token_viejo = jwt.encode(
            {"sub": "1107068093", "rol": "admin"},
            "secreto-que-fue-rotado-hace-meses-32-bytes",
            algorithm="HS256",
        )
        cedula = ServicioAuth.obtener_cedula_desde_token(token_viejo)
        assert cedula is None

    def test_obtener_payload_token_con_secreto_viejo_retorna_none(self):
        """El helper obtener_payload_token debe ser defensivo."""
        token_viejo = jwt.encode(
            {"sub": "x", "rol": "admin", "scope": "read"},
            "secreto-viejo-que-no-es-el-actual-32-bytes-x",
            algorithm="HS256",
        )
        payload = ServicioAuth.obtener_payload_token(token_viejo)
        assert payload is None
