"""
Servidor MCP para Gestor de Proyectos TI.

Este proceso es invocado por `mcp_run.py` (que lee el token del keyring
del SO y lo expone como env var). El servidor expone 6 tools al LLM
(Claude Desktop, Cursor, etc.) y aplica:

- Rate limit local por tool y global (token bucket)
- Verificación de scope (read vs write) CON verificación de firma JWT
- Pasa el token Bearer al backend en cada request

El cliente MCP NO debe poder eludir la verificación de scope modificando
el payload del JWT — la firma se valida localmente con GPM_JWT_SECRET.

Uso (cliente MCP):
    command: uv
    args: [run, scripts/mcp/mcp_run.py, <nombre_logico>]

Variables de entorno (seteadas por mcp_run.py):
    GPM_TOKEN       Token JWT firmado (BLOQUEANTE)
    GPM_TOKEN_NAME  Nombre lógico en el keyring
    GPM_API_URL     URL del backend (default: http://127.0.0.1:8000/api/v2)
    GPM_JWT_SECRET  Secreto para verificar firma (BLOQUEANTE para scope check)
"""
import asyncio
import json
import logging
import os
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger("mcp-server")
logging.basicConfig(
    level=os.environ.get("GPM_LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,  # MCP usa stdout para protocolo; logs a stderr
)

API_URL = os.environ.get("GPM_API_URL", "http://127.0.0.1:8000/api/v2")
TOKEN = os.environ.get("GPM_TOKEN", "")
TOKEN_NAME = os.environ.get("GPM_TOKEN_NAME", "")
JWT_SECRET = os.environ.get("GPM_JWT_SECRET", "")

if not TOKEN:
    logger.warning(
        "GPM_TOKEN no esta en el ambiente al importar. "
        "Si vas a ejecutar main(), configuralo antes. "
        "Los tests pueden importar el módulo sin el token."
    )


# ── Rate limit (token bucket) ──────────────────────────────────
RATE_LIMIT_PER_TOOL = int(os.environ.get("GPM_RATE_PER_TOOL", "60"))
RATE_LIMIT_GLOBAL = int(os.environ.get("GPM_RATE_GLOBAL", "600"))


@dataclass
class TokenBucket:
    capacity: int
    tokens: float
    refill_per_sec: float
    last: float

    def consume(self, n: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self.last
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_per_sec)
        self.last = now
        if self.tokens >= n:
            self.tokens -= n
            return True
        return False


def _make_bucket(capacity: int) -> TokenBucket:
    return TokenBucket(
        capacity=capacity,
        tokens=float(capacity),
        refill_per_sec=capacity / 60.0,
        last=time.monotonic(),
    )


_tool_buckets: dict[str, TokenBucket] = defaultdict(lambda: _make_bucket(RATE_LIMIT_PER_TOOL))
_global_bucket: TokenBucket = _make_bucket(RATE_LIMIT_GLOBAL)


def _check_rate_limit(tool_name: str) -> None:
    """Aplica rate limit por tool + global. Falla cerrado si excede."""
    if not _global_bucket.consume():
        raise RuntimeError(
            f"Rate limit global excedido ({RATE_LIMIT_GLOBAL}/min). "
            f"Esperá unos segundos antes de seguir."
        )
    if not _tool_buckets[tool_name].consume():
        raise RuntimeError(
            f"Rate limit de '{tool_name}' excedido "
            f"({RATE_LIMIT_PER_TOOL}/min)."
        )


# ── Scope check (con verificación de firma JWT) ────────────────
SCOPE_HIERARCHY = {"read": 1, "write": 2}


def _get_token_scope() -> str:
    """Lee el scope del token VERIFICANDO FIRMA.

    Si no se verifica firma, un atacante que intercepte un token read-only
    podria modificar el payload a scope=write sin que el servidor MCP lo
    detecte. El backend ya verificó al emitir, pero el cliente debe
    reverificar localmente (defense in depth).
    """
    if not JWT_SECRET:
        raise PermissionError(
            "GPM_JWT_SECRET no esta configurado. El servidor MCP requiere "
            "el secreto JWT para verificar la firma del token. "
            "Configuralo en el JSON del cliente MCP."
        )
    try:
        from jose import jwt
        from jose.exceptions import JWTError
    except ImportError:
        raise RuntimeError(
            "Dependencia 'python-jose' no instalada. "
            "Ejecuta: uv run --with python-jose[cryptography] scripts/mcp/mcp_run.py ..."
        )
    try:
        payload = jwt.decode(
            TOKEN,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_exp": False, "verify_aud": False},
        )
        return payload.get("scope", "read")
    except JWTError as e:
        raise PermissionError(
            f"Firma del token invalida: {e}. El token fue manipulado "
            f"o GPM_JWT_SECRET no coincide con el del backend."
        )


TOOL_SCOPE_REQUIRED = {
    "whoami": "read",
    "listar_desarrollos": "read",
    "obtener_desarrollo": "read",
    "listar_actividades": "read",
}


def _check_scope(tool_name: str) -> None:
    """Rechaza tools que requieren scope superior al del token.

    Falla cerrado si la firma no valida o si el scope es insuficiente.
    Se ejecuta ANTES de hacer la request HTTP para que un token read-only
    no consuma cuota del backend.
    """
    required = TOOL_SCOPE_REQUIRED.get(tool_name, "read")
    current = _get_token_scope()
    if SCOPE_HIERARCHY.get(current, 0) < SCOPE_HIERARCHY.get(required, 0):
        raise PermissionError(
            f"Tool '{tool_name}' requiere scope='{required}', "
            f"tu token tiene scope='{current}'. "
            f"Genera uno nuevo desde la app con scope=write."
        )


# ── HTTP client compartido ─────────────────────────────────────
_http: httpx.AsyncClient | None = None


async def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(
            base_url=API_URL,
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "X-MCP-Token-Name": TOKEN_NAME,
            },
            timeout=30.0,
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        )
    return _http


async def _call_backend(method: str, path: str, **kwargs) -> Any:
    """Llama al backend y retorna la respuesta parseada.

    Raises:
        httpx.HTTPStatusError: si el backend retorna 4xx/5xx
    """
    http = await _get_http()
    r = await http.request(method, path, **kwargs)  # [CONTROLADO]
    if r.status_code == 204:
        return None
    r.raise_for_status()
    if not r.content:
        return None
    return r.json()


# ── Tool implementations ───────────────────────────────────────
async def tool_whoami(arguments: dict) -> str:
    """Retorna información del usuario autenticado por el token MCP."""
    data = await _call_backend("GET", "/auth/yo")
    cedula = data.get("cedula", "?")
    nombre = data.get("nombre", data.get("name", "?"))
    rol = data.get("rol", data.get("role", "?"))
    return json.dumps(
        {
            "cedula": cedula,
            "nombre": nombre,
            "rol": rol,
            "token_name": TOKEN_NAME,
            "scope_token": _get_token_scope(),
        },
        ensure_ascii=False,
        indent=2,
    )


async def tool_listar_desarrollos(arguments: dict) -> str:
    """Lista desarrollos (WBS/actividades del sistema).

    Args:
        skip: int (default 0)
        limit: int (default 50, max 200)
        estado: str opcional (filtra por estado)
    """
    params = {}
    if "skip" in arguments:
        params["skip"] = arguments["skip"]
    if "limit" in arguments:
        params["limit"] = min(int(arguments["limit"]), 200)
    if "estado" in arguments and arguments["estado"]:
        params["estado"] = arguments["estado"]
    data = await _call_backend("GET", "/desarrollos/", params=params)
    return json.dumps(
        {"total": len(data) if isinstance(data, list) else None, "items": data},
        ensure_ascii=False,
        indent=2,
        default=str,
    )


async def tool_obtener_desarrollo(arguments: dict) -> str:
    """Obtiene un desarrollo por ID.

    Args:
        desarrollo_id: str (requerido)
    """
    did = arguments.get("desarrollo_id")
    if not did:
        raise ValueError("desarrollo_id es requerido")
    data = await _call_backend("GET", f"/desarrollos/{did}")
    return json.dumps(data, ensure_ascii=False, indent=2, default=str)


async def tool_listar_actividades(arguments: dict) -> str:
    """Lista actividades (WBS) de un desarrollo via endpoint agregado.

    El backend expone `/desarrollos_actividades/{desarrollo_id}` que retorna
    el desarrollo con todas sus actividades anidadas.

    Args:
        desarrollo_id: str (requerido)
    """
    did = arguments.get("desarrollo_id")
    if not did:
        raise ValueError("desarrollo_id es requerido")
    data = await _call_backend("GET", f"/desarrollos_actividades/{did}")
    actividades = data.get("actividades", []) if isinstance(data, dict) else []
    return json.dumps(
        {
            "desarrollo_id": data.get("id") if isinstance(data, dict) else did,
            "total_actividades": len(actividades),
            "actividades": actividades,
        },
        ensure_ascii=False,
        indent=2,
        default=str,
    )


# ── Tool registry ──────────────────────────────────────────────
TOOLS = {
    "whoami": {
        "description": (
            "Retorna la identidad del usuario que emitió el token MCP. "
            "Útil para confirmar autenticación y permisos antes de operar."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
        "handler": tool_whoami,
    },
    "listar_desarrollos": {
        "description": (
            "Lista los desarrollos/actividades del sistema. "
            "Soporta paginación y filtro por estado."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "skip": {"type": "integer", "description": "Offset (default 0)"},
                "limit": {"type": "integer", "description": "Max items (default 50, max 200)"},
                "estado": {"type": "string", "description": "Filtrar por estado"},
            },
        },
        "handler": tool_listar_desarrollos,
    },
    "obtener_desarrollo": {
        "description": "Obtiene el detalle de un desarrollo específico por su ID.",
        "input_schema": {
            "type": "object",
            "properties": {"desarrollo_id": {"type": "string"}},
            "required": ["desarrollo_id"],
        },
        "handler": tool_obtener_desarrollo,
    },
    "listar_actividades": {
        "description": (
            "Lista las actividades (WBS) registradas en un desarrollo "
            "específico, vía el endpoint agregado de desarrollos+actividades."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"desarrollo_id": {"type": "string"}},
            "required": ["desarrollo_id"],
        },
        "handler": tool_listar_actividades,
    },
}


# ── MCP server bootstrap ───────────────────────────────────────
async def main() -> None:
    """Inicializa el servidor MCP stdio y queda escuchando."""
    if not TOKEN:
        logger.error("GPM_TOKEN no esta en el ambiente. mcp_run.py debe inyectarlo.")
        sys.exit(1)
    try:
        from mcp.server import Server
        from mcp.server.stdio import stdio_server
        from mcp.types import Tool, TextContent
    except ImportError:
        logger.error(
            "Dependencia 'mcp' no instalada. "
            "Ejecuta: uv run --with mcp --with httpx --with keyring --with python-jose[cryptography] "
            "scripts/mcp/mcp_run.py ..."
        )
        sys.exit(1)

    logger.info(
        "Iniciando mcp_server.py (token_name=%s, api_url=%s, scope=%s)",
        TOKEN_NAME or "?",
        API_URL,
        _get_token_scope(),
    )

    server = Server("gestor-proyectos-ti")

    @server.list_tools()
    async def list_tools():
        return [
            Tool(
                name=name,
                description=spec["description"],
                inputSchema=spec["input_schema"],
            )
            for name, spec in TOOLS.items()
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict):
        if name not in TOOLS:
            raise ValueError(f"Tool '{name}' no existe")
        t0 = time.monotonic()
        try:
            _check_rate_limit(name)
            _check_scope(name)
            result = await TOOLS[name]["handler"](arguments)
            dur_ms = int((time.monotonic() - t0) * 1000)
            logger.info("tool=%s status=ok duracion_ms=%d jti=?", name, dur_ms)
            return [TextContent(type="text", text=result)]
        except Exception as e:
            dur_ms = int((time.monotonic() - t0) * 1000)
            logger.warning(
                "tool=%s status=error duracion_ms=%d error=%s",
                name, dur_ms, type(e).__name__,
            )
            raise

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(130)
