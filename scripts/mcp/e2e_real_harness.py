"""
Harness E2E real contra backend en 127.0.0.1:8000 + keyring del SO.

Flujo:
1. Lee password de GPM_TEST_PASSWORD (NO prompt — el operador la pasa
   como env var temporal para que no quede en historial de shell ni en
   la conversacion).
2. POST /auth/login -> session_token
3. POST /auth/mcp-token -> mcp_token
4. Guarda mcp_token en keyring con nombre logico gpm_mcp_1107068093_e2e
5. Invoca mcp_run.py como subproceso con ese nombre
6. Verifica que el subproceso arranca, recibe GPM_TOKEN por env, e intenta
   levantar mcp_server.py (que NO existe todavia en scripts/mcp/, asi que
   esperamos el mensaje de "mcp_server.py no encontrado" — eso PRUEBA
   que el flujo llego hasta el final sin fallar antes).
7. Limpia el keyring.

Uso:
    GPM_TEST_PASSWORD='xxx' PYTHONIOENCODING=utf-8 python scripts/mcp/e2e_real_harness.py  # [CONTROLADO]

El harness BORRA el env var y limpia el keyring al final. La password
nunca se imprime, nunca se loguea, nunca se escribe a un archivo.
"""
import os
import sys
import json
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
API_URL = "http://127.0.0.1:8000/api/v2"
CEDULA = "1107068093"
KEYRING_NAME = f"gpm_mcp_{CEDULA}_e2e"

# Banner que se imprime al inicio (sin password)
print("=" * 70)
print(f"E2E real — cédula {CEDULA} contra {API_URL}")
print("=" * 70)

password = os.environ.get("GPM_TEST_PASSWORD")
if not password:
    print("ERROR: GPM_TEST_PASSWORD no está en el ambiente.")
    print("Uso: GPM_TEST_PASSWORD='xxx' python scripts/mcp/e2e_real_harness.py")  # [CONTROLADO]
    sys.exit(2)

# Borrar de os.environ inmediatamente para que no quede accesible
# a prints accidentales ni a subprocesos que hereden el env.
del os.environ["GPM_TEST_PASSWORD"]

import httpx
import keyring

resultados = []

# --- Paso 1: login normal ---
print("\n[1/5] POST /auth/login (form-encoded)")
try:
    r = httpx.post(
        f"{API_URL}/auth/login",
        data={"username": CEDULA, "password": password},
        timeout=30.0,
    )
    if r.status_code != 200:
        print(f"   FAIL: HTTP {r.status_code} — {r.text[:200]}")
        resultados.append(("login", False))
        sys.exit(1)
    session = r.json()
    ok = "access_token" in session
    resultados.append(("login", ok))
    print(f"   OK: session_token len={len(session.get('access_token', ''))}")
except Exception as e:
    print(f"   FAIL: {type(e).__name__}: {e}")
    sys.exit(1)

# --- Paso 2: emitir mcp_token ---
print("\n[2/5] POST /auth/mcp-token (JSON + Bearer)")
try:
    r = httpx.post(
        f"{API_URL}/auth/mcp-token",
        json={"vigencia_dias": 7, "scope": "read", "motivo": "E2E harness"},
        headers={"Authorization": f"Bearer {session['access_token']}"},
        timeout=30.0,
    )
    if r.status_code != 200:
        print(f"   FAIL: HTTP {r.status_code} — {r.text[:200]}")
        resultados.append(("mcp_token_emitir", False))
        sys.exit(1)
    mcp = r.json()
    print(f"   OK: jti={mcp.get('jti')}, scope={mcp.get('scope')}, expira={mcp.get('expires_at')}")
    resultados.append(("mcp_token_emitir", True))
except Exception as e:
    print(f"   FAIL: {type(e).__name__}: {e}")
    sys.exit(1)

# --- Paso 3: guardar en keyring ---
print(f"\n[3/5] keyring.set_password('{KEYRING_NAME}', ...)")
try:
    keyring.set_password("gestor-proyectos-ti-mcp", KEYRING_NAME, mcp["access_token"])
    stored = keyring.get_password("gestor-proyectos-ti-mcp", KEYRING_NAME)
    ok = stored == mcp["access_token"]
    resultados.append(("keyring_set", ok))
    print(f"   {'OK' if ok else 'FAIL'}: round-trip {'coincide' if ok else 'DIFIERE'}")
except Exception as e:
    print(f"   FAIL: {type(e).__name__}: {e}")
    sys.exit(1)

# --- Paso 4: invocar mcp_run.py (sin mcp_server.py, esperamos error claro) ---
print(f"\n[4/5] Invocar mcp_run.py {KEYRING_NAME}")
try:
    r = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "mcp_run.py"), KEYRING_NAME],
        capture_output=True,
        text=True,
        encoding="utf-8",
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        timeout=15,
    )
    # Esperamos rc=1 con mensaje "No se encontro mcp_server.py"
    # Eso prueba que: (a) leyo el token del keyring, (b) intento spawnear
    # el subproceso, (c) fallo por estructura incompleta, no por auth.
    no_token_error = "No se encontro token" not in r.stderr
    server_missing = "No se encontro mcp_server.py" in r.stderr
    ok = r.returncode == 1 and no_token_error and server_missing
    print(f"   rc={r.returncode}, encontró server missing: {server_missing}")
    print(f"   stderr: {r.stderr[:300]}")
    resultados.append(("mcp_run_invocar", ok))
except Exception as e:
    print(f"   FAIL: {type(e).__name__}: {e}")
    resultados.append(("mcp_run_invocar", False))

# --- Paso 5: listar tokens MCP activos (debe aparecer el nuestro) ---
print("\n[5/5] GET /auth/mcp-tokens (verificar persistencia)")
try:
    r = httpx.get(
        f"{API_URL}/auth/mcp-tokens",
        headers={"Authorization": f"Bearer {session['access_token']}"},
        timeout=30.0,
    )
    if r.status_code != 200:
        print(f"   FAIL: HTTP {r.status_code} — {r.text[:200]}")
        resultados.append(("mcp_tokens_listar", False))
    else:
        tokens = r.json().get("tokens", [])
        nuestro = [t for t in tokens if t.get("jti") == mcp.get("jti")]
        ok = len(nuestro) == 1
        print(f"   {'OK' if ok else 'FAIL'}: {len(tokens)} tokens total, {len(nuestro)} coincide con nuestro jti")
        resultados.append(("mcp_tokens_listar", ok))
except Exception as e:
    print(f"   FAIL: {type(e).__name__}: {e}")
    resultados.append(("mcp_tokens_listar", False))

# --- Limpieza ---
print("\n[cleanup] keyring.delete_password")
try:
    keyring.delete_password("gestor-proyectos-ti-mcp", KEYRING_NAME)
    print("   OK: keyring entry eliminado")
except Exception as e:
    print(f"   WARN: no se pudo limpiar keyring: {e}")

# --- Resumen ---
print("\n" + "=" * 70)
print("RESUMEN E2E")
print("=" * 70)
for paso, ok in resultados:
    print(f"  {'OK  ' if ok else 'FAIL'} {paso}")
total = len(resultados)
pasaron = sum(1 for _, ok in resultados if ok)
print(f"\n{pasaron}/{total} pasos exitosos")
sys.exit(0 if pasaron == total else 1)
