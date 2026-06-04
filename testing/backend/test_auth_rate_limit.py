"""
Test unit para F1.1: _login_key_func del rate limiter en core/rate_limiter.py.

Cubre la key function del /auth/login que combina IP con cédula del form
para evitar evasión por rotación de X-Forwarded-For. NO requiere Docker, DB,
ni bcrypt. Pico RAM ~80MB.
"""

import pytest
from starlette.requests import Request


def _build_request(
    client_ip: str = "1.2.3.4",
    client_port: int = 5000,
    body: bytes | None = None,
) -> Request:
    """
    Construye un Request de Starlette mínimo con los atributos que
    _login_key_func necesita: scope['client'] y _body.
    """
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v2/auth/login",
        "headers": [(b"content-type", b"application/x-www-form-urlencoded")],
        "client": (client_ip, client_port),
        "query_string": b"",
    }
    request = Request(scope)
    if body is not None:
        # OAuth2PasswordRequestForm cachea el body en request._body
        # después de parsearlo. _login_key_func lee desde ahí.
        request._body = body
    return request


class TestLoginKeyFunc:
    """Tests de _login_key_func (sin instanciar el Limiter completo)."""

    def test_key_incluye_ip_y_cedula(self):
        """La key debe tener el formato 'login:<ip>:<cedula>'."""
        from app.core.rate_limiter import _login_key_func

        request = _build_request(
            client_ip="192.168.1.10",
            body=b"username=1107068093&password=foo",
        )
        key = _login_key_func(request)
        assert key == "login:192.168.1.10:1107068093"

    def test_cedula_se_normaliza_a_lowercase(self):
        """'ABC123' y 'abc123' deben producir la misma key (case-insensitive)."""
        from app.core.rate_limiter import _login_key_func

        upper = _login_key_func(_build_request(body=b"username=ABC123&password=x"))
        lower = _login_key_func(_build_request(body=b"username=abc123&password=x"))
        assert upper == lower
        assert "abc123" in upper

    def test_cedula_se_trimea(self):
        """'  123  ' (con espacios) se normaliza a '123'."""
        from app.core.rate_limiter import _login_key_func

        request = _build_request(body=b"username=%20%20123%20%20&password=x")
        key = _login_key_func(request)
        assert key.endswith(":123")

    def test_distintas_ips_producen_distintas_keys(self):
        """El componente IP de la key diferencia orígenes de red."""
        from app.core.rate_limiter import _login_key_func

        k1 = _login_key_func(_build_request(client_ip="1.1.1.1", body=b"username=99"))
        k2 = _login_key_func(_build_request(client_ip="2.2.2.2", body=b"username=99"))
        assert k1 != k2
        assert "1.1.1.1" in k1
        assert "2.2.2.2" in k2

    def test_sin_body_retorna_cedula_vacia(self):
        """Si no hay body (request sin _body), la key usa cédula vacía.
        El rate limit sigue activo pero no agrupa por usuario."""
        from app.core.rate_limiter import _login_key_func

        request = _build_request(client_ip="5.5.5.5")  # sin body
        key = _login_key_func(request)
        assert key == "login:5.5.5.5:"

    def test_body_malformado_no_crashea(self):
        """Si parse_qs falla (body corrupto), la key usa cédula vacía.
        Esto evita que un atacante tumbe el endpoint enviando bytes basura."""
        from app.core.rate_limiter import _login_key_func

        request = _build_request(body=b"\xff\xfe\x00\x01binario")
        key = _login_key_func(request)
        # Aunque la cédula quede vacía, la key no debe explotar
        assert key.startswith("login:")
        assert key.endswith(":")

    def test_body_sin_campo_username_retorna_vacio(self):
        """Si el form no trae 'username', la parte de cédula queda vacía."""
        from app.core.rate_limiter import _login_key_func

        request = _build_request(body=b"password=solo_esto")
        key = _login_key_func(request)
        assert key.endswith(":")

    def test_username_con_caracteres_especiales_se_preserva(self):
        """La cédula original se preserva en la key tal cual (sin sanitizar).
        Importante para que el rate limit sea exacto: la misma cédula con
        variantes de encoding NO evade el bucket."""
        from app.core.rate_limiter import _login_key_func

        request = _build_request(body=b"username=user%40empresa.com&password=x")
        key = _login_key_func(request)
        # parse_qs decodea url-encoding, así que %40 -> @
        assert "user@empresa.com" in key

    def test_prefijo_login_diferencia_de_otras_keys(self):
        """El prefijo 'login:' aísla los buckets de /auth/login de los de
        /config/verify-admin (que usan _verify_admin_key_func con prefijo
        implícito por el state). Esto previene colisiones accidentales."""
        from app.core.rate_limiter import _login_key_func

        request = _build_request(body=b"username=99")
        key = _login_key_func(request)
        assert key.startswith("login:")


class TestLimiterSingleton:
    """Verifica que el limiter exportado es un singleton compartido y reseteable."""

    def test_limiter_se_puede_resetear(self):
        """La fixture limiter_reset (autouse) llama .reset() en cada test.
        Aquí verificamos que el método existe y no crashea con buckets vacíos."""
        from app.core.rate_limiter import limiter

        # Si no crashea con estado vacío, el reset funciona
        limiter.reset()
        # Llamar dos veces seguidas también debe ser no-op
        limiter.reset()


class TestDesbloquearRateLimitLogica:
    """Verifica que la lógica para desbloquear la cédula de un usuario en el storage funcione."""

    def test_desbloquear_remueve_clave_del_storage(self):
        from app.core.rate_limiter import limiter
        storage = limiter.limiter.storage

        # Limpiar antes de la prueba
        limiter.reset()

        # Añadir un hit simulado en el storage
        key_simulada = "LIMITER/login:1.2.3.4:12345678///10/1/minute"
        storage.incr(key_simulada, 60)

        # Confirmamos que el hit existe
        assert storage.get(key_simulada) == 1

        # Simular el desbloqueo para la cédula 12345678
        cedula_patron = ":12345678"
        if hasattr(storage, "storage") and hasattr(storage, "expirations"):
            keys_to_delete = [k for k in storage.storage.keys() if cedula_patron in k.lower()]
            for k in keys_to_delete:
                storage.storage.pop(k, None)
                storage.expirations.pop(k, None)
                if hasattr(storage, "events") and k in storage.events:
                    storage.events.pop(k, None)

        # Verificar que se eliminó
        assert storage.get(key_simulada) == 0
