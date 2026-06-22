"""
Guardrails P0 de ciberseguridad para rutas /api/v2.

Estas pruebas fuerzan el principio deny-by-default: toda ruta bajo /api/v2
debe ser publica por allowlist explicita o declarar/ejecutar autenticacion.
"""

from fastapi.testclient import TestClient

from app.core.security_policy import PUBLIC_API_OPERATIONS
from app.main import app
from app.services.auth.servicio import ServicioAuth


def _api_v2_operations():
    schema = app.openapi()
    for path, methods in schema["paths"].items():
        if not path.startswith("/api/v2"):
            continue
        for method, operation in methods.items():
            method_upper = method.upper()
            if method_upper not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
                continue
            yield method_upper, path, operation


def test_openapi_declara_seguridad_en_rutas_api_no_publicas():
    """Toda ruta /api/v2 no publica debe declarar seguridad Bearer en OpenAPI."""
    rutas_sin_seguridad = []

    for method, path, operation in _api_v2_operations():
        if (method, path) in PUBLIC_API_OPERATIONS:
            continue
        if not operation.get("security"):
            rutas_sin_seguridad.append(f"{method} {path}")

    assert not rutas_sin_seguridad, (
        "Rutas /api/v2 sin seguridad declarada: "
        + ", ".join(rutas_sin_seguridad[:30])
    )


def test_rutas_sensibles_rechazan_peticion_sin_token():
    """Rutas sensibles historicamente publicas deben responder 401 sin Bearer."""
    client = TestClient(app, raise_server_exceptions=False)
    rutas_sensibles = [
        ("GET", "/api/v2/erp/empleado/123"),
        ("POST", "/api/v2/erp/sincronizar"),
        ("POST", "/api/v2/solid/seed"),
        ("GET", "/api/v2/viaticos/estado-cuenta?cedula=123"),
        ("POST", "/api/v2/inventario/config"),
    ]

    for method, path in rutas_sensibles:
        response = client.request(method, path, json={"ronda_activa": 1})
        assert response.status_code == 401, f"{method} {path} retorno {response.status_code}"


def test_allowlist_publica_mantiene_healthcheck_sin_token():
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/api/v2/health")

    assert response.status_code == 200
    assert response.json()["estado"] == "saludable"


def test_ruta_sensible_rechaza_bearer_invalido():
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get(
        "/api/v2/erp/empleado/123",
        headers={"Authorization": "Bearer token.invalido"},
    )

    assert response.status_code == 401


def test_ruta_sensible_rechaza_token_de_recuperacion():
    client = TestClient(app, raise_server_exceptions=False)
    token = ServicioAuth.crear_token_recuperacion("USR-123")

    response = client.get(
        "/api/v2/erp/solicitudes",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_ruta_sensible_rechaza_token_de_verificacion_correo():
    client = TestClient(app, raise_server_exceptions=False)
    token = ServicioAuth.crear_token_verificacion("USR-123")

    response = client.get(
        "/api/v2/erp/solicitudes",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_preflight_options_no_exige_bearer():
    client = TestClient(app, raise_server_exceptions=False)

    response = client.options(
        "/api/v2/erp/empleado/123",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code in {200, 204}


def test_401_de_middleware_conserva_cors_para_origen_permitido():
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get(
        "/api/v2/erp/empleado/123",
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.status_code == 401
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
