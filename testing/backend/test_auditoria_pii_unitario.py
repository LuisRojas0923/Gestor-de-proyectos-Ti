import pytest
from app.services.auditoria.servicio import _enmascarar_datos, _anonimizar_identidad_entidad

def test_enmascarar_datos_lineas_corporativas():
    payload = {
        "imei": "123456789012345",
        "icc": "8957432000000000001",
        "pin": "1234",
        "puk": "56789012",
        "contrasena": "secret",
        "nombre": "Juan",
        "otro_campo": "valor_seguro"
    }

    resultado = _enmascarar_datos(payload, modulo="lineas_corporativas")

    assert resultado["imei"] == "[REDACTED]"
    assert resultado["icc"] == "[REDACTED]"
    assert resultado["pin"] == "[REDACTED]"
    assert resultado["puk"] == "[REDACTED]"
    assert resultado["contrasena"] == "[REDACTED]"
    assert resultado["nombre"] == "[REDACTED]"
    assert resultado["otro_campo"] == "valor_seguro"

def test_anonimizar_identidad_entidad_lineas_corporativas():
    resultado1 = _anonimizar_identidad_entidad("lineas_corporativas", "persona_linea", "CED-12345678-algo", "/api/v2/lineas-corporativas/personas/CED-12345678-algo")
    assert resultado1 == ("[REDACTED]", "/api/v2/lineas-corporativas/personas/[REDACTED]")

    resultado2 = _anonimizar_identidad_entidad("lineas_corporativas", "equipo_movil", "equipo-movil-123", "/api/v2/lineas-corporativas/equipos/equipo-movil-123")
    assert resultado2 == ("equipo-movil-123", "/api/v2/lineas-corporativas/equipos/equipo-movil-123")

    resultado3 = _anonimizar_identidad_entidad("otro_modulo", "persona_linea", "CED-12345678-algo", "/api/v2/otro/personas/CED-12345678-algo")
    assert resultado3 == ("CED-12345678-algo", "/api/v2/otro/personas/CED-12345678-algo")
