"""
E2E real del mcp_server.py: arranca el servidor, envia un initialize +
list_tools + call_tool via JSON-RPC por stdin/stdout, captura respuesta.

Pre-requisitos:
- Backend en 127.0.0.1:8000 alcanzable
- Token MCP valido (mcp_token_real)
- GPM_JWT_SECRET en el ambiente (= valor de JWT_SECRET_KEY en .env)
- Paquete `mcp` instalado

Uso:
    GPM_TEST_PASSWORD=tu_contrasena python scripts/mcp/e2e_mcp_server.py
"""
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
API_URL = "http://127.0.0.1:8000/api/v2"
CEDULA = "1107068093"
KEYRING_NAME = f"gpm_mcp_{CEDULA}_e2e"
JWT_SECRET = None  # leido de .env

# Cargar JWT_SECRET_KEY del .env (sin contaminar os.environ)
_env_path = Path(__file__).resolve().parents[2] / ".env"
with _env_path.open(encoding="utf-8") as f:
    for line in f:
        if line.startswith("JWT_SECRET_KEY="):
            JWT_SECRET = line.split("=", 1)[1].strip().strip('"').strip("'")
            break
if not JWT_SECRET:
    print("ERROR: no se encontro JWT_SECRET_KEY en .env")
    sys.exit(2)

# Obtener token: login + emitir MCP token
import httpx
import keyring

password = os.environ.get("GPM_TEST_PASSWORD")
if not password:
    print("ERROR: GPM_TEST_PASSWORD no esta en el ambiente")
    sys.exit(2)
del os.environ["GPM_TEST_PASSWORD"]  # borrar inmediatamente

print("=" * 70)
print("E2E mcp_server.py — JSON-RPC via stdio contra backend real")
print("=" * 70)

# Paso 1: login + obtener un token MCP existente de la DB
print("\n[1/3] Login + obtener token MCP valido de la DB")
r = httpx.post(
    f"{API_URL}/auth/login",
    data={"username": CEDULA, "password": password},
    timeout=30.0,
)
r.raise_for_status()
session = r.json()["access_token"]

# Listar metadata primero (para saber que jti esta activo)
r = httpx.get(
    f"{API_URL}/auth/mcp-tokens",
    headers={"Authorization": f"Bearer {session}"},
    timeout=30.0,
)
r.raise_for_status()
tokens = r.json().get("tokens", [])
if not tokens:
    print("   FAIL: no hay tokens MCP activos. Emitir uno primero.")
    sys.exit(1)

# Extraer JWT de la DB via docker exec (solo para E2E)
mcp_jti = tokens[0]["jti"]
db_result = subprocess.run(
    ["docker", "compose", "exec", "-T", "db", "psql",
     "-U", "user", "-d", "project_manager", "-t", "-A", "-c",
     f"SELECT token_sesion FROM sesiones WHERE jti = '{mcp_jti}' AND fin_sesion IS NULL AND expira_en > NOW();"],
    capture_output=True, text=True, timeout=10,
)
mcp_token = db_result.stdout.strip()
if not mcp_token:
    print(f"   FAIL: no se pudo extraer token de DB para jti={mcp_jti}")
    print(f"   stderr: {db_result.stderr[:200]}")
    sys.exit(1)
mcp = {"jti": mcp_jti, "scope": "read", "access_token": mcp_token}
print(f"   OK: jti={mcp_jti}, token_len={len(mcp_token)}")

# Paso 2: arrancar mcp_server.py con env vars correctas
print("\n[2/3] Spawn mcp_server.py con stdin pipe")
env = {
    **os.environ,
    "GPM_TOKEN": mcp_token,
    "GPM_TOKEN_NAME": "e2e_test",
    "GPM_JWT_SECRET": JWT_SECRET,
    "GPM_API_URL": API_URL,
    "PYTHONIOENCODING": "utf-8",
}

# Mensajes JSON-RPC para el lifecycle MCP:
# 1. initialize
# 2. notifications/initialized (sin response esperada)
# 3. tools/list
# 4. tools/call whoami
# 5. tools/call listar_desarrollos
# 6. tools/call obtener_desarrollo (con un ID cualquiera)
# 7. tools/call listar_actividades (debe fallar por falta de desarrollo_id)
messages = [
    {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "e2e-test", "version": "0.1"},
    }},
    {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}},
    {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
    {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {
        "name": "whoami", "arguments": {},
    }},
    {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {
        "name": "listar_desarrollos", "arguments": {"limit": 2},
    }},
    {"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {
        "name": "obtener_desarrollo", "arguments": {"desarrollo_id": "ACT-99999"},
    }},
    {"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {
        "name": "listar_actividades", "arguments": {},
    }},
]

# Serializar: cada mensaje en una linea (newline-delimited JSON-RPC)
# MCP stdio transport acepta JSON-LSP (Content-Length) Y newline-delimited.
# Probamos newline primero por simplicidad.
#
# CRITICO: NO cerramos stdin al terminar de escribir. Si lo cerramos, el
# MCP library ve EOF y cierra su write_stream antes de que las respuestas
# asincronas (con HTTP round-trip) alcancen a escribirse, produciendo
# anyio.ClosedResourceError. Solucion: leer stdout en un thread mientras
# dejamos stdin abierto, y matar el proceso al final.

import threading


def _reader_thread(stream, sink: list, sink_lock: threading.Lock, done: threading.Event):
    """Lee stream en chunks hasta que done se active o EOF."""
    while not done.is_set():
        chunk = stream.read(4096)
        if not chunk:
            break
        with sink_lock:
            sink.append(chunk)


try:
    proc = subprocess.Popen(
        [sys.executable, str(SCRIPT_DIR / "mcp_server.py")],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
    )

    stdout_chunks: list = []
    stderr_chunks: list = []
    chunks_lock = threading.Lock()
    reader_done = threading.Event()

    t_out = threading.Thread(
        target=_reader_thread,
        args=(proc.stdout, stdout_chunks, chunks_lock, reader_done),
        daemon=True,
    )
    t_err = threading.Thread(
        target=_reader_thread,
        args=(proc.stderr, stderr_chunks, chunks_lock, reader_done),
        daemon=True,
    )
    t_out.start()
    t_err.start()

    # Escribir todos los mensajes con flush entre cada uno.
    assert proc.stdin is not None
    for msg in messages:
        body = json.dumps(msg).encode("utf-8") + b"\n"
        proc.stdin.write(body)
        proc.stdin.flush()

    # NO cerrar stdin — eso cancela write_stream. En su lugar, esperar
    # a que el servidor envie todas las respuestas y matarlo.
    # Timeout: 15s deberia bastar para 4 tool calls con HTTP local.
    try:
        proc.wait(timeout=15)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)

    # Detener readers y juntar output.
    reader_done.set()
    t_out.join(timeout=2)
    t_err.join(timeout=2)

    stdout = b"".join(stdout_chunks).decode("utf-8", errors="replace")
    stderr = b"".join(stderr_chunks).decode("utf-8", errors="replace")
except FileNotFoundError as e:
    print(f"   FAIL: no se encontro el script: {e}")
    sys.exit(1)

# Ver todo el stderr
print(f"\n   --- stderr completo ({len(stderr)} chars) ---")
print(stderr[-1500:])

# Parsear frames de stdout (newline-delimited JSON)
print(f"   rc={proc.returncode}")
print(f"   stderr (primeras lineas):")
for line in stderr.splitlines()[:10]:
    print(f"     {line}")

print(f"\n[3/3] Parsear respuestas JSON-RPC")
print(f"   stdout raw ({len(stdout)} bytes):")
for i, line in enumerate(stdout.splitlines()[:30]):
    print(f"     [{i}] {line[:120]}")

frames = []
for line in stdout.splitlines():
    line = line.strip()
    if not line:
        continue
    try:
        frames.append(json.loads(line))
    except json.JSONDecodeError:
        pass  # logs/notifications parciales

# Validar
resultados = []
for frame in frames:
    rid = frame.get("id")
    if rid is None:
        continue  # notification
    if "error" in frame:
        resultados.append((f"id={rid}", "error", frame["error"].get("message", "")[:100]))
    else:
        result_str = json.dumps(frame.get("result", {}), ensure_ascii=False)[:150]
        resultados.append((f"id={rid}", "ok", result_str))

print("\n--- Respuestas ---")
for rid, status, info in resultados:
    print(f"  [{status:5s}] {rid}: {info}")

# Verificaciones
print("\n--- Verificaciones ---")
checks = []

# Parsear respuestas del stdout (pueden llegar incompletas por cancellation)
parsed_ids = {int(r[0].split("=")[1]): r for r in resultados}

# Tambien leer del stderr las confirmaciones de tool calls
def _stder_contiene(patron):
    return patron in stderr

# 1. initialize
if "id=1" in str(parsed_ids) and "serverInfo" in str(parsed_ids.get(1, ("","",""))[2]):
    checks.append("initialize: serverInfo presente")
# 2. tools/list
if "id=2" in str(parsed_ids) and "whoami" in str(parsed_ids.get(2, ("","",""))[2]):
    checks.append("tools/list: tools registrados")
# 3. whoami — verificar via stderr que llamo al backend con 200
if "tool=whoami status=ok" in stderr:
    checks.append("whoami: retorno 200 OK del backend")
# 4. listar_desarrollos
if "tool=listar_desarrollos status=ok" in stderr:
    checks.append("listar_desarrollos: retorno 200 OK del backend")
# 5. obtener_desarrollo (404 es valido — el ID no existe pero el endpoint respondio)
if "tool=obtener_desarrollo" in stderr and "404" in stderr.split("tool=obtener_desarrollo")[1][:300]:
    checks.append("obtener_desarrollo: backend respondio (404 esperado)")
# 6. listar_actividades sin args — validacion correcta via stderr
if "tool=listar_actividades status=error" in stderr and "desarrollo_id" in stderr:
    checks.append("listar_actividades sin args: rechazado por validacion")

for c in checks:
    print(f"  + {c}")

print(f"\n{'=' * 70}")
print(f"E2E: {len(checks)}/5 verificaciones pasaron")
print(f"{'=' * 70}")

# Cleanup: revocar el token emitido
try:
    httpx.delete(
        f"{API_URL}/auth/mcp-tokens/{mcp['jti']}",
        headers={"Authorization": f"Bearer {session}"},
        timeout=10.0,
    )
    print(f"Cleanup: token {mcp['jti']} revocado")
except Exception as e:
    print(f"Cleanup WARN: {e}")

sys.exit(0 if len(checks) == 5 else 1)
