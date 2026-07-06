"""
Tests del servidor MCP (Fase 4) — helpers puros, no requiere mcp library.

Cubre:
- TokenBucket: consume devuelve True hasta agotar, False después
- _check_rate_limit: aplica límite por tool y global
- _get_token_scope: decodifica JWT, rechaza firma inválida, requiere secret
- _check_scope: jerarquía read < write, falla cerrado
- TOOL_SCOPE_REQUIRED: todos los tools tienen scope declarado
- TOOLS: schemas válidos (mcp-compatible)

Estrategia: cargar mcp_server como módulo, monkey-patchear las env vars
que necesita (TOKEN, JWT_SECRET) y los buckets para reset entre tests.

Ejecutar:
    PYTHONIOENCODING=utf-8 python scripts/mcp/test_mcp_server.py
"""
import importlib.util
import io
import os
import sys
import time
from contextlib import contextmanager
from pathlib import Path
from unittest import mock

SCRIPT = Path(__file__).resolve().parent / "mcp_server.py"


def _cargar_modulo(env=None):
    """Carga mcp_server.py con env vars controladas.

    mcp_server.py lee TOKEN al import-time y aborta si falta. Por eso
    monkey-patcheamos os.environ ANTES de exec_module.
    """
    saved = os.environ.copy()
    os.environ.update(env or {})
    if "GPM_TOKEN" not in os.environ:
        os.environ["GPM_TOKEN"] = "TEST_TOKEN"
    if "GPM_JWT_SECRET" not in os.environ:
        os.environ["GPM_JWT_SECRET"] = ""
    try:
        spec = importlib.util.spec_from_file_location("mcp_server_test", SCRIPT)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    finally:
        os.environ.clear()
        os.environ.update(saved)


def _secret_de_32_bytes() -> str:
    return "a" * 32 + "_padding_to_32_bytes_minimum_ok"


def _generar_jwt(scope: str, secret: str) -> str:
    from jose import jwt
    return jwt.encode(
        {"sub": "1107068093", "rol": "admin", "scope": scope, "token_type": "mcp"},
        secret,
        algorithm="HS256",
    )


# ── TokenBucket ────────────────────────────────────────────────
def t1_token_bucket_consume_hasta_agotar():
    from scripts.mcp.mcp_server import TokenBucket  # type: ignore
    b = TokenBucket(capacity=5, tokens=5.0, refill_per_sec=0.0, last=time.monotonic())
    ok = [b.consume() for _ in range(5)]
    agotado = b.consume()
    todo_ok = all(ok) and not agotado
    print(f"{'OK' if todo_ok else 'FAIL'} T1 bucket consume: 5 ok + 1 fail = {ok + [agotado]}")
    return todo_ok


def t2_token_bucket_refill():
    """Con refill > 0, después de esperar debería tener tokens de nuevo."""
    from scripts.mcp.mcp_server import TokenBucket  # type: ignore
    b = TokenBucket(capacity=2, tokens=0.0, refill_per_sec=100.0, last=time.monotonic())
    time.sleep(0.05)
    recargado = b.consume()
    recargado2 = b.consume()
    agotado = b.consume()
    ok = recargado and recargado2 and not agotado
    print(f"{'OK' if ok else 'FAIL'} T2 bucket refill: consume={recargado}/{recargado2}/{agotado}")
    return ok


# ── Rate limit (per-tool + global) ─────────────────────────────
def t3_rate_limit_per_tool():
    """Agotar el bucket de un tool especifico lanza RuntimeError."""
    mod = _cargar_modulo()
    # Forzar bucket conocido: capacity=2
    from scripts.mcp.mcp_server import TokenBucket  # type: ignore
    mod._tool_buckets["test_tool"] = TokenBucket(
        capacity=2, tokens=2.0, refill_per_sec=0.0, last=time.monotonic()
    )
    # Reset global para que no interfiera
    mod._global_bucket = TokenBucket(
        capacity=10000, tokens=10000.0, refill_per_sec=0.0, last=time.monotonic()
    )
    mod._check_rate_limit("test_tool")
    mod._check_rate_limit("test_tool")
    try:
        mod._check_rate_limit("test_tool")
        print("FAIL T3 per_tool: no levanto excepcion en el 3er call")
        return False
    except RuntimeError as e:
        ok = "test_tool" in str(e) and "60/min" in str(e)
        print(f"{'OK' if ok else 'FAIL'} T3 per_tool: levanto RuntimeError: {e}")
        return ok


def t4_rate_limit_global():
    """El global corta ANTES que el per-tool si esta mas bajo."""
    mod = _cargar_modulo()
    from scripts.mcp.mcp_server import TokenBucket  # type: ignore
    mod._global_bucket = TokenBucket(
        capacity=1, tokens=1.0, refill_per_sec=0.0, last=time.monotonic()
    )
    mod._tool_buckets["otro_tool"] = TokenBucket(
        capacity=100, tokens=100.0, refill_per_sec=0.0, last=time.monotonic()
    )
    mod._check_rate_limit("otro_tool")
    try:
        mod._check_rate_limit("otro_tool")
        print("FAIL T4 global: no levanto excepcion en el 2do call")
        return False
    except RuntimeError as e:
        ok = "global" in str(e).lower()
        print(f"{'OK' if ok else 'FAIL'} T4 global: levanto: {e}")
        return ok


# ── Scope check con JWT ────────────────────────────────────────
def t5_scope_sin_secreto_falla_cerrado():
    """Sin GPM_JWT_SECRET, _get_token_scope lanza PermissionError."""
    mod = _cargar_modulo(env={"GPM_JWT_SECRET": ""})
    try:
        mod._get_token_scope()
        print("FAIL T5 sin_secreto: no levanto excepcion")
        return False
    except PermissionError as e:
        ok = "GPM_JWT_SECRET" in str(e)
        print(f"{'OK' if ok else 'FAIL'} T5 sin_secreto: PermissionError: {e}")
        return ok


def t6_scope_firma_valida_retorna_scope():
    """Con firma valida, retorna el scope del payload."""
    secret = _secret_de_32_bytes()
    token = _generar_jwt("write", secret)
    mod = _cargar_modulo(env={"GPM_TOKEN": token, "GPM_JWT_SECRET": secret})
    scope = mod._get_token_scope()
    ok = scope == "write"
    print(f"{'OK' if ok else 'FAIL'} T6 firma_valida: scope={scope}")
    return ok


def t7_scope_firma_invalida_rechaza():
    """Si el token fue firmado con OTRO secret, _get_token_scope rechaza."""
    secret_real = _secret_de_32_bytes()
    secret_atacante = "z" * 32 + "_padding_to_32_bytes_minimum_ok"
    token = _generar_jwt("write", secret_atacante)
    mod = _cargar_modulo(env={"GPM_TOKEN": token, "GPM_JWT_SECRET": secret_real})
    try:
        mod._get_token_scope()
        print("FAIL T7 firma_invalida: no levanto excepcion")
        return False
    except PermissionError as e:
        ok = "Firma del token invalida" in str(e)
        print(f"{'OK' if ok else 'FAIL'} T7 firma_invalida: {e}")
        return ok


def t8_scope_token_sin_scope_default_read():
    """JWT sin claim 'scope' se trata como 'read' (default conservador)."""
    secret = _secret_de_32_bytes()
    from jose import jwt
    token = jwt.encode({"sub": "x", "rol": "user"}, secret, algorithm="HS256")
    mod = _cargar_modulo(env={"GPM_TOKEN": token, "GPM_JWT_SECRET": secret})
    scope = mod._get_token_scope()
    ok = scope == "read"
    print(f"{'OK' if ok else 'FAIL'} T8 sin_scope_default: scope={scope}")
    return ok


# ── _check_scope jerarquía ─────────────────────────────────────
def t9_check_scope_read_puede_invocar_read():
    """Token read puede llamar tools read."""
    secret = _secret_de_32_bytes()
    token = _generar_jwt("read", secret)
    mod = _cargar_modulo(env={"GPM_TOKEN": token, "GPM_JWT_SECRET": secret})
    # whoami requiere read
    mod._check_scope("whoami")
    print("OK T9 read->read permitido")
    return True


def t10_check_scope_read_NO_puede_invocar_write_sintetico():
    """El mecanismo de jerarquía funciona: con un tool que requiera 'write',
    un token 'read' debe ser rechazado. Usamos un nombre de tool inventado
    para no depender del registry."""
    secret = _secret_de_32_bytes()
    token = _generar_jwt("read", secret)
    mod = _cargar_modulo(env={"GPM_TOKEN": token, "GPM_JWT_SECRET": secret})
    # Inyectar tool ficticio que requiere write
    mod.TOOL_SCOPE_REQUIRED["_test_write_tool"] = "write"
    try:
        mod._check_scope("_test_write_tool")
        print("FAIL T10 read->write_sintetico: permitio llamada indebida")
        return False
    except PermissionError as e:
        ok = "write" in str(e) and "read" in str(e)
        print(f"{'OK' if ok else 'FAIL'} T10 read->write_sintetico: {e}")
        return ok
    finally:
        del mod.TOOL_SCOPE_REQUIRED["_test_write_tool"]


def t11_check_scope_write_puede_invocar_todo():
    """Token write SI puede llamar tools read y write (jerarquía)."""
    secret = _secret_de_32_bytes()
    token = _generar_jwt("write", secret)
    mod = _cargar_modulo(env={"GPM_TOKEN": token, "GPM_JWT_SECRET": secret})
    mod.TOOL_SCOPE_REQUIRED["_test_write_tool"] = "write"
    try:
        mod._check_scope("whoami")  # read OK
        mod._check_scope("_test_write_tool")  # write OK
        print("OK T11 write->{read,write}_sintetico permitido")
        return True
    finally:
        del mod.TOOL_SCOPE_REQUIRED["_test_write_tool"]


def t12_check_scope_scope_desconocido_falla_cerrado():
    """Si el JWT tiene scope='admin' (no esperado), se trata como jerarquía 0."""
    secret = _secret_de_32_bytes()
    token = _generar_jwt("admin", secret)
    mod = _cargar_modulo(env={"GPM_TOKEN": token, "GPM_JWT_SECRET": secret})
    try:
        mod._check_scope("whoami")  # requiere read
        print("FAIL T12 scope_desconocido: permitio llamada")
        return False
    except PermissionError as e:
        ok = "admin" in str(e)
        print(f"{'OK' if ok else 'FAIL'} T12 scope_desconocido: {e}")
        return ok


# ── TOOL_SCOPE_REQUIRED: cobertura ─────────────────────────────
def t13_todos_los_tools_tienen_scope():
    """Todos los tools tienen scope declarado en TOOL_SCOPE_REQUIRED."""
    mod = _cargar_modulo()
    tools_esperados = {
        "whoami", "listar_desarrollos", "obtener_desarrollo", "listar_actividades",
    }
    ok_tools = set(mod.TOOLS.keys()) == tools_esperados
    ok_scope = set(mod.TOOL_SCOPE_REQUIRED.keys()) == tools_esperados
    for t in tools_esperados:
        s = mod.TOOL_SCOPE_REQUIRED[t]
        if s not in ("read", "write"):
            print(f"FAIL T13 scope_invalido: {t}={s}")
            return False
    print(
        f"{'OK' if ok_tools and ok_scope else 'FAIL'} T13 cobertura: "
        f"tools={len(mod.TOOLS)}, scope={len(mod.TOOL_SCOPE_REQUIRED)}"
    )
    return ok_tools and ok_scope


def t14_schemas_mcp_compatibles():
    """Cada tool tiene input_schema con type y properties (formato MCP)."""
    mod = _cargar_modulo()
    invalidos = []
    for name, spec in mod.TOOLS.items():
        schema = spec.get("input_schema", {})
        if schema.get("type") != "object":
            invalidos.append(f"{name}: type invalido")
        if "properties" not in schema:
            invalidos.append(f"{name}: sin properties")
        if not callable(spec.get("handler")):
            invalidos.append(f"{name}: handler no callable")
    ok = not invalidos
    print(
        f"{'OK' if ok else 'FAIL'} T14 schemas: "
        f"{len(mod.TOOLS)} tools"
        + (f", problemas: {invalidos}" if invalidos else "")
    )
    return ok


# ── Wrappers (no requieren red) ────────────────────────────────
def t15_listar_actividades_requiere_desarrollo_id():
    """tool_listar_actividades sin desarrollo_id -> ValueError, no red."""
    import asyncio
    mod = _cargar_modulo()
    try:
        asyncio.run(mod.tool_listar_actividades({}))
        print("FAIL T15 sin_id: no levanto excepcion")
        return False
    except ValueError as e:
        ok = "desarrollo_id" in str(e)
        print(f"{'OK' if ok else 'FAIL'} T15 sin_id: {e}")
        return ok


def t16_obtener_desarrollo_requiere_id():
    import asyncio
    mod = _cargar_modulo()
    try:
        asyncio.run(mod.tool_obtener_desarrollo({}))
        print("FAIL T16 sin_id: no levanto excepcion")
        return False
    except ValueError as e:
        ok = "desarrollo_id" in str(e)
        print(f"{'OK' if ok else 'FAIL'} T16 sin_id: {e}")
        return ok


def t17_crear_actividad_ya_no_existe():
    """El tool crear_actividad se removio (backend no expone el endpoint)."""
    mod = _cargar_modulo()
    ok = "crear_actividad" not in mod.TOOLS
    print(f"{'OK' if ok else 'FAIL'} T17 crear_actividad removido: presente={not ok}")
    return ok


# ── HTTP client singleton ──────────────────────────────────────
def t18_http_client_usa_bearer_token():
    """_get_http setea Authorization: Bearer <TOKEN> en headers."""
    import asyncio
    secret = _secret_de_32_bytes()
    token = _generar_jwt("read", secret)
    mod = _cargar_modulo(env={"GPM_TOKEN": token, "GPM_JWT_SECRET": secret})
    mod._http = None
    http = asyncio.run(mod._get_http())
    auth = http.headers.get("Authorization", "")  # [CONTROLADO]
    token_name_hdr = http.headers.get("X-MCP-Token-Name", "")  # [CONTROLADO]
    ok = auth == f"Bearer {token}" and token_name_hdr == ""
    print(f"{'OK' if ok else 'FAIL'} T18 http_headers: Authorization={auth[:30]}..., X-MCP-Token-Name={token_name_hdr!r}")
    mod._http = None
    return ok


def t19_http_client_token_name_en_header():
    import asyncio
    mod = _cargar_modulo(env={"GPM_TOKEN_NAME": "gpm_mcp_test_xyz"})
    mod._http = None
    http = asyncio.run(mod._get_http())
    name_hdr = http.headers.get("X-MCP-Token-Name", "")  # [CONTROLADO]
    ok = name_hdr == "gpm_mcp_test_xyz"
    print(f"{'OK' if ok else 'FAIL'} T19 token_name_header: {name_hdr!r}")
    mod._http = None
    return ok


def main():
    print("=" * 70)
    print("Tests mcp_server.py (Fase 4 — helpers puros)")
    print("=" * 70)

    tests = [
        t1_token_bucket_consume_hasta_agotar,
        t2_token_bucket_refill,
        t3_rate_limit_per_tool,
        t4_rate_limit_global,
        t5_scope_sin_secreto_falla_cerrado,
        t6_scope_firma_valida_retorna_scope,
        t7_scope_firma_invalida_rechaza,
        t8_scope_token_sin_scope_default_read,
        t9_check_scope_read_puede_invocar_read,
        t10_check_scope_read_NO_puede_invocar_write_sintetico,
        t11_check_scope_write_puede_invocar_todo,
        t12_check_scope_scope_desconocido_falla_cerrado,
        t13_todos_los_tools_tienen_scope,
        t14_schemas_mcp_compatibles,
        t15_listar_actividades_requiere_desarrollo_id,
        t16_obtener_desarrollo_requiere_id,
        t17_crear_actividad_ya_no_existe,
        t18_http_client_usa_bearer_token,
        t19_http_client_token_name_en_header,
    ]

    resultados = []
    for t in tests:
        try:
            resultados.append(bool(t()))
        except Exception as e:
            import traceback
            print(f"FAIL {t.__name__}: excepcion {type(e).__name__}: {e}")
            traceback.print_exc()
            resultados.append(False)
        print()

    total = len(resultados)
    pasaron = sum(resultados)
    print("=" * 70)
    print(f"Resultado: {pasaron}/{total} tests pasaron")
    print("=" * 70)
    return 0 if pasaron == total else 1


if __name__ == "__main__":
    # Necesario para `from scripts.mcp.mcp_server import TokenBucket`
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    sys.exit(main())
