"""
Wrapper que el cliente MCP invoca (Claude Desktop, Cursor, etc.).

Lee el token MCP del keyring del SO y lo expone como variable de entorno
al subproceso `mcp_server.py`. CRITICO: este script NO contiene el token
en su codigo. El JSON de configuracion del cliente solo tiene un nombre
logico (ej. "gpm_mcp_1107068093"). El token vive en el keyring, protegido
por DPAPI en Windows, Keychain en macOS, o Secret Service en Linux.

Uso (configuracion del cliente MCP):
  command: uv
  args: [run, scripts/mcp/mcp_run.py, <nombre_logico>]

Ver docs/PLAN_SERVIDOR_MCP.md seccion 7.
"""
import os
import subprocess
import sys
from pathlib import Path

import keyring

KEYRING_SERVICE = "gestor-proyectos-ti-mcp"
SCRIPT_DIR = Path(__file__).resolve().parent


def _detectar_keyring_backend() -> str:
    try:
        return keyring.get_keyring().__class__.__name__
    except Exception as e:
        return f"error: {e}"


def _leer_token(nombre_logico: str) -> str | None:
    """Lee el token del keyring. None si no existe."""
    return keyring.get_password(KEYRING_SERVICE, nombre_logico)


def main() -> int:
    if len(sys.argv) < 2:
        print(
            "Uso: mcp_run.py <nombre_logico_token>\n"
            "   Ejemplo: mcp_run.py gpm_mcp_1107068093\n"
            "   Genera el token con: scripts/mcp/mcp_token_cli.py",
            file=sys.stderr,
        )
        return 1

    nombre_logico = sys.argv[1]
    backend = _detectar_keyring_backend()

    token = _leer_token(nombre_logico)
    if not token:
        print(
            f"❌ No se encontro token '{nombre_logico}' en {backend}.\n"
            f"   Genera uno con: uv run scripts/mcp/mcp_token_cli.py",
            file=sys.stderr,
        )
        return 1

    mcp_server = SCRIPT_DIR / "mcp_server.py"
    if not mcp_server.exists():
        print(
            f"❌ No se encontro mcp_server.py en {mcp_server}.\n"
            f"   La estructura del paquete scripts/mcp/ esta incompleta.",
            file=sys.stderr,
        )
        return 1

    # Spawn del servidor MCP real con el token en env.
    # CRITICO: usamos env=env (copia) para no contaminar os.environ del wrapper.
    env = os.environ.copy()
    env["GPM_TOKEN"] = token
    env["GPM_TOKEN_NAME"] = nombre_logico
    env["GPM_KEYRING_BACKEND"] = backend

    try:
        proc = subprocess.run(
            [sys.executable, str(mcp_server)],
            env=env,
            stdin=sys.stdin,
            stdout=sys.stdout,
            stderr=sys.stderr,
        )
        return proc.returncode
    except KeyboardInterrupt:
        return 130
    except FileNotFoundError as e:
        print(f"❌ Python o mcp_server.py no encontrado: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"❌ Error lanzando mcp_server.py: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
