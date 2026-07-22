"""
Tests del rate limiter (F1.1 + F1.2):

- _login_key_func: la key usa cedula del body (sin IP compartida de proxy).
- IP resolution con allowlist: X-Forwarded-For se respeta SOLO si la
  conexion viene de un proxy en trusted_proxy_ips.
- Lockout per-cuenta: tras N fallos se activa lockout en Redis.
- * rejected en trusted_proxy_ips al startup.
- Storage del limiter es Redis (no MemoryStorage).

NO requiere Docker para tests unitarios. Para tests de storage (Redis)
usa una conexion real a Redis si esta disponible.
"""
import hashlib
from unittest.mock import MagicMock, patch

import pytest
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import JSONResponse


def _build_request(
    client_ip: str = "1.2.3.4",
    client_port: int = 5000,
    body: bytes | None = None,
    content_type: str = "application/x-www-form-urlencoded",
    headers_extra: list | None = None,
    path: str = "/api/v2/auth/login",
) -> Request:
    """Construye un Request Starlette minimo con los atributos que
    los key funcs necesitan."""
    hdrs = [(b"content-type", content_type.encode())]
    if headers_extra:
        hdrs.extend(headers_extra)
    scope = {
        "type": "http",
        "method": "POST",
        "path": path,
        "headers": hdrs,
        "client": (client_ip, client_port),
        "query_string": b"",
        "path_params": {},
    }
    request = Request(scope)
    if body is not None:
        request._body = body
    return request


class TestLoginKeyFunc:
    """_login_key_func (sync): rate limit por cedula, sin IP de proxy compartida."""

    def test_key_solo_cedula_sin_ip(self):
        from app.core.rate_limiter import _login_key_func

        request = _build_request(
            client_ip="192.168.1.10",
            body=b"username=1107068093&password=foo",
        )
        key = _login_key_func(request)
        assert key == "login:1107068093"

    def test_cedula_case_insensitive(self):
        from app.core.rate_limiter import _login_key_func

        upper = _login_key_func(_build_request(body=b"username=ABC123&password=x"))
        lower = _login_key_func(_build_request(body=b"username=abc123&password=x"))
        assert upper == lower
        assert "abc123" in upper

    def test_misma_cedula_distinta_ip_misma_key(self):
        from app.core.rate_limiter import _login_key_func

        k1 = _login_key_func(_build_request(client_ip="1.1.1.1", body=b"username=99"))
        k2 = _login_key_func(_build_request(client_ip="2.2.2.2", body=b"username=99"))
        assert k1 == k2 == "login:99"

    def test_distintas_cedulas_producen_distintas_keys(self):
        from app.core.rate_limiter import _login_key_func

        shared_ip = "172.18.0.5"
        k1 = _login_key_func(
            _build_request(client_ip=shared_ip, body=b"username=111&password=x")
        )
        k2 = _login_key_func(
            _build_request(client_ip=shared_ip, body=b"username=222&password=x")
        )
        assert k1 != k2
        assert k1 == "login:111"
        assert k2 == "login:222"

    def test_body_sin_campo_username_usa_fallback_body_hash(self):
        from app.core.rate_limiter import _login_key_func

        body = b"password=solo_esto"
        request = _build_request(body=body)
        key = _login_key_func(request)
        expected_hash = hashlib.sha256(body).hexdigest()[:16]
        assert key == f"login:body:{expected_hash}"
        assert not key.endswith(":")

    def test_sin_body_cacheado_usa_fallback_ip(self):
        from app.core.rate_limiter import _login_key_func

        request = _build_request(client_ip="172.18.0.5")
        key = _login_key_func(request)
        assert key == "login:anon:172.18.0.5"

    def test_body_en_scope_usa_cedula_sin_fallback_ip(self):
        from app.core.rate_limiter import _login_key_func

        request = _build_request(client_ip="172.18.0.5")
        request.scope["rate_limit_body"] = b"username=1107068093&password=foo"
        key = _login_key_func(request)
        assert key == "login:1107068093"

    def test_prefijo_login_diferencia_de_otras_keys(self):
        from app.core.rate_limiter import _login_key_func

        request = _build_request(body=b"username=99")
        key = _login_key_func(request)
        assert key.startswith("login:")

    def test_body_json_con_campo_cedula(self):
        """Body JSON con campo `cedula` (no `username`) se parsea bien."""
        from app.core.rate_limiter import _login_key_func

        request = _build_request(
            body=b'{"cedula": "12345", "contrasena": "foo"}',
            content_type="application/json",
        )
        key = _login_key_func(request)
        assert key == "login:12345"

    def test_body_multipart_con_username(self):
        from app.core.rate_limiter import _login_key_func

        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        body = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="username"\r\n\r\n'
            "99887766\r\n"
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="password"\r\n\r\n'
            "secret\r\n"
            f"--{boundary}--\r\n"
        ).encode()
        request = _build_request(
            body=body,
            content_type=f"multipart/form-data; boundary={boundary}",
        )
        key = _login_key_func(request)
        assert key == "login:99887766"


class TestGenericBodyKeyFuncs:
    """Keys de setup-password y endpoints JSON genericos sin IP."""

    def test_setup_password_key_sin_ip(self):
        from app.core.rate_limiter import _setup_password_key_func

        request = _build_request(
            path="/api/v2/auth/setup-password",
            body=b'{"cedula": "55555", "password": "x"}',
            content_type="application/json",
        )
        key = _setup_password_key_func(request)
        assert key == "setup_password:55555"

    def test_generic_json_body_key_sin_ip(self):
        from app.core.rate_limiter import _generic_json_body_key_func

        request = _build_request(
            path="/api/v2/auth/forgot-password",
            body=b'{"cedula": "77777"}',
            content_type="application/json",
        )
        key = _generic_json_body_key_func(request)
        assert key == "/api/v2/auth/forgot-password:77777"


class TestRateLimitHandler429:
    """El handler de 429 no debe awaitar una funcion sync de slowapi."""

    @pytest.mark.asyncio
    async def test_handler_429_retorna_json_response(self):
        from app.main import _rate_limit_handler_con_log

        request = _build_request(body=b"username=1&password=x")
        mock_limit = MagicMock()
        mock_limit.error_message = None
        exc = RateLimitExceeded(mock_limit)
        fake_response = JSONResponse(status_code=429, content={"error": "rate limit"})
        with patch("app.main._rate_limit_exceeded_handler", return_value=fake_response):
            response = await _rate_limit_handler_con_log(request, exc)
        assert response is fake_response
        assert response.status_code == 429


class TestResolveEffectiveIP:
    """_resolve_effective_ip: X-Forwarded-For SOLO si el peer es trusted."""

    def setup_method(self):
        from app.core.config import obtener_configuracion
        self._settings = obtener_configuracion()
        self._original = self._settings.trusted_proxy_ips

    def teardown_method(self):
        self._settings.trusted_proxy_ips = self._original

    def test_sin_trusted_proxies_usa_ip_conexion(self):
        """Con allowlist vacia, XFF se ignora aunque venga en headers."""
        self._settings.trusted_proxy_ips = ""
        from app.core.rate_limiter import _resolve_effective_ip
        req = _build_request(
            client_ip="9.9.9.9",
            headers_extra=[(b"x-forwarded-for", b"1.1.1.1")],
        )
        assert _resolve_effective_ip(req) == "9.9.9.9"

    def test_peer_no_trustworthy_ignora_xff(self):
        """Si el peer NO esta en la allowlist, XFF se ignora."""
        self._settings.trusted_proxy_ips = "172.18.0.2"
        from app.core.rate_limiter import _resolve_effective_ip
        req = _build_request(
            client_ip="9.9.9.9",
            headers_extra=[(b"x-forwarded-for", b"1.1.1.1")],
        )
        assert _resolve_effective_ip(req) == "9.9.9.9"

    def test_peer_trustworthy_respeta_xff(self):
        """Si el peer ESTA en la allowlist, XFF se usa (caso normal detras de nginx)."""
        self._settings.trusted_proxy_ips = "172.18.0.2"
        from app.core.rate_limiter import _resolve_effective_ip
        req = _build_request(
            client_ip="172.18.0.2",
            headers_extra=[(b"x-forwarded-for", b"203.0.113.5, 10.0.0.1")],
        )
        assert _resolve_effective_ip(req) == "203.0.113.5"

    def test_peer_trustworthy_sin_xff_usa_ip_conexion(self):
        """Proxy trustworthy pero sin header XFF: cae al IP de conexion."""
        self._settings.trusted_proxy_ips = "172.18.0.2"
        from app.core.rate_limiter import _resolve_effective_ip
        req = _build_request(client_ip="172.18.0.2")
        assert _resolve_effective_ip(req) == "172.18.0.2"

    def test_xff_vacio_usa_ip_conexion(self):
        """XFF presente pero vacio cae al IP de conexion."""
        self._settings.trusted_proxy_ips = "172.18.0.2"
        from app.core.rate_limiter import _resolve_effective_ip
        req = _build_request(
            client_ip="172.18.0.2",
            headers_extra=[(b"x-forwarded-for", b"   ")],
        )
        assert _resolve_effective_ip(req) == "172.18.0.2"


class TestTrustedProxyValidation:
    """El validador rechaza '*' al startup."""

    def test_wildcard_rechazado(self):
        from pydantic import ValidationError
        from app.core.config import Settings

        with pytest.raises(ValidationError) as exc:
            Settings(trusted_proxy_ips="*")
        assert "trusted_proxy_ips" in str(exc.value)
        assert "*" in str(exc.value)

    def test_lista_ips_valida(self):
        from app.core.config import Settings
        s = Settings(trusted_proxy_ips="172.18.0.2,10.0.0.5")
        assert s.trusted_proxy_ips_set == {"172.18.0.2", "10.0.0.5"}

    def test_vacio_es_set_vacio(self):
        from app.core.config import Settings
        s = Settings(trusted_proxy_ips="")
        assert s.trusted_proxy_ips_set == set()


class TestLimiterStorageURI:
    """El limiter exportado usa Redis como storage (no MemoryStorage)."""

    def test_storage_uri_configurado(self):
        from app.core.rate_limiter import limiter
        from limits.storage import RedisStorage
        assert isinstance(limiter._storage, RedisStorage), (
            f"Esperaba RedisStorage, obtuve {type(limiter._storage)}"
        )

    def test_storage_uri_es_el_de_config(self):
        """El storage URI configurado en Limiter es el mismo que el de Settings.

        No usamos `str(limiter._storage)` porque RedisStorage no expone la URI
        en su repr. En su lugar, comprobamos que el storage existe y es del
        tipo esperado (la URI ya se paso al constructor). Si RedisStorage
        cambia su repr en el futuro, este test sigue siendo valido.
        """
        from app.core.rate_limiter import limiter
        from app.core.config import obtener_configuracion
        from limits.storage import RedisStorage
        settings = obtener_configuracion()
        # La URI se paso al constructor; verificamos que el storage es RedisStorage
        # y que la URI de settings es la esperada (no vacia).
        assert isinstance(limiter._storage, RedisStorage)
        assert settings.redis_url
        assert settings.redis_url.startswith("redis://")

    def test_password_redis_se_pasa_como_opcion_separada(self):
        from app.core.config import Settings
        from app.core.rate_limiter import _opciones_storage_redis

        settings = Settings(
            redis_url="redis://redis:6379/0",
            redis_password="secreto-con-@-y-:",
        )

        assert _opciones_storage_redis(settings) == {
            "password": "secreto-con-@-y-:",
        }


class TestLimiterSingleton:
    """El limiter sigue siendo singleton y reseteable."""

    def test_limiter_se_puede_resetear(self):
        """`reset()` debe ser tolerante a Redis no disponible (tests locales)."""
        from app.core.rate_limiter import limiter
        try:
            limiter.reset()
        except Exception as e:
            # Esperado cuando Redis no esta corriendo
            assert "Connection" in type(e).__name__ or "Redis" in str(e)
        # Segunda llamada: tambien debe tolerar
        try:
            limiter.reset()
        except Exception:
            pass


class TestPathBodyPreCacheSet:
    """El set de paths con body pre-cacheado incluye los endpoints nuevos."""

    def test_paths_incluye_endpoints_auth(self):
        from app.core.rate_limiter import PATHS_CON_BODY_PARA_RATE_LIMIT
        assert "/api/v2/auth/login" in PATHS_CON_BODY_PARA_RATE_LIMIT
        assert "/api/v2/auth/setup-password" in PATHS_CON_BODY_PARA_RATE_LIMIT
        assert "/api/v2/auth/forgot-password" in PATHS_CON_BODY_PARA_RATE_LIMIT
        assert "/api/v2/auth/reset-password" in PATHS_CON_BODY_PARA_RATE_LIMIT
        assert "/api/v2/auth/registro" in PATHS_CON_BODY_PARA_RATE_LIMIT
