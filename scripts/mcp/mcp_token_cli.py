"""
CLI para generar tokens MCP de larga duración (ver docs/PLAN_SERVIDOR_MCP.md §6).

Flujo:
1. Carga .env y valida que JWT_SECRET_KEY no sea default ni < 32 bytes
2. Pide cédula + contraseña (con getpass para no quedar en historial de shell)
3. POST /auth/login (form-encoded) → token de sesión web
4. POST /auth/mcp-token (JSON + Bearer) → token MCP de 30 días default
5. Ofrece guardar en keyring del SO (recomendado) o mostrar y copiar

Uso:
    python scripts/mcp/mcp_token_cli.py
    # o
    uv run scripts/mcp/mcp_token_cli.py
"""
import getpass
import sys
from pathlib import Path

import httpx
import keyring

KEYRING_SERVICE = "gestor-proyectos-ti-mcp"
VIGENCIA_DEFAULT_DIAS = 30
VIGENCIA_MAXIMA_DIAS = 90
SCOPES_PERMITIDOS = ("read", "write")
SECRETOS_INVALIDOS = {
    "clave-segura-cambiar",
    "cambiar-en-produccion",
    "secret",
    "changeme",
    "",
}


def _cargar_env() -> dict:
    """Carga .env manualmente sin contaminar el proceso del operador."""
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        sys.exit(f"❌ No se encontró .env en {env_path}")
    env = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def _validar_secreto_jwt(secreto: str) -> None:
    """Rechaza secretos default o con entropía insuficiente.

    Crítico: si el script firmara con `clave-segura-cambiar` (default legacy
    en `app/config.py:49`), un atacante podría generar tokens válidos para
    cualquier backend que no haya sobreescrito el .env.
    """
    if secreto in SECRETOS_INVALIDOS:
        sys.exit(
            f"❌ JWT_SECRET_KEY tiene el valor default inseguro: '{secreto}'.\n"
            "   Define un secreto de al menos 32 bytes en .env antes de\n"
            "   generar tokens MCP."
        )
    if len(secreto.encode("utf-8")) < 32:
        sys.exit(
            f"❌ JWT_SECRET_KEY tiene {len(secreto)} caracteres, se requieren ≥ 32.\n"
            '   Genera uno con: python -c "import secrets; print(secrets.token_urlsafe(32))"'
        )


def _detectar_api_url(env: dict) -> str:
    """Detecta la URL del backend desde .env o usa default local."""
    host = env.get("BACKEND_HOST", "127.0.0.1")
    port = env.get("BACKEND_PORT", "8000")
    return f"http://{host}:{port}/api/v2"


def _detectar_keyring_backend() -> str:
    """Loguea qué backend de keyring está usando el SO."""
    try:
        return keyring.get_keyring().__class__.__name__
    except Exception as e:
        return f"(error detectando: {e})"


def _login(
    client: httpx.Client, api_url: str, cedula: str, password: str
) -> str:
    """POST /auth/login (form-encoded) → access_token de sesión web."""
    r = client.post(
        f"{api_url}/auth/login",
        data={"username": cedula, "password": password},
    )
    if r.status_code != 200:
        sys.exit(
            f"❌ Login falló ({r.status_code}): {r.text[:300]}\n"
            "   Verifica cédula y contraseña."
        )
    return r.json()["access_token"]


def _emitir_mcp_token(
    client: httpx.Client,
    api_url: str,
    session_token: str,
    vigencia_dias: int,
    scope: str,
    motivo: str,
) -> dict:
    """POST /auth/mcp-token (JSON + Bearer) → access_token MCP."""
    r = client.post(
        f"{api_url}/auth/mcp-token",
        json={
            "vigencia_dias": vigencia_dias,
            "scope": scope,
            "motivo": motivo,
        },
        headers={"Authorization": f"Bearer {session_token}"},
    )
    if r.status_code != 200:
        sys.exit(
            f"❌ Emisión de token MCP falló ({r.status_code}): {r.text[:300]}"
        )
    return r.json()


def _guardar_en_keyring(nombre: str, token: str) -> None:
    keyring.set_password(KEYRING_SERVICE, nombre, token)


def main() -> int:
    env = _cargar_env()
    _validar_secreto_jwt(env.get("JWT_SECRET_KEY", ""))
    api_url = _detectar_api_url(env)
    keyring_backend = _detectar_keyring_backend()

    print("🔐 Generador de tokens MCP — Gestor de Proyectos TI")
    print(f"   Backend:           {api_url}")
    print(f"   Keyring backend:   {keyring_backend}")
    print()

    cedula = input("Cédula: ").strip()
    contrasena = getpass.getpass("Contraseña: ")
    if not cedula or not contrasena:
        sys.exit("❌ Cédula y contraseña son requeridas")

    print()
    scope_input = input(
        f"Scope [{'/'.join(SCOPES_PERMITIDOS)}] (default read): "
    ).strip().lower()
    scope = scope_input or "read"
    if scope not in SCOPES_PERMITIDOS:
        sys.exit(f"❌ Scope inválido. Debe ser uno de: {SCOPES_PERMITIDOS}")

    vigencia_str = input(
        f"Vigencia en días (1-{VIGENCIA_MAXIMA_DIAS}, default {VIGENCIA_DEFAULT_DIAS}): "
    ).strip()
    vigencia = int(vigencia_str) if vigencia_str else VIGENCIA_DEFAULT_DIAS
    if not 1 <= vigencia <= VIGENCIA_MAXIMA_DIAS:
        sys.exit(
            f"❌ Vigencia debe estar entre 1 y {VIGENCIA_MAXIMA_DIAS} días"
        )

    motivo = input("Motivo (auditoría): ").strip() or "CLI MCP sin motivo especificado"

    with httpx.Client(timeout=30.0) as client:
        print("\n🔑 Autenticando contra el backend...")
        try:
            session_token = _login(client, api_url, cedula, contrasena)
        except httpx.ConnectError as e:
            sys.exit(
                f"❌ No se pudo conectar al backend en {api_url}.\n"
                f"   Verifica que el backend esté corriendo (docker compose up backend)\n"
                f"   Detalle: {e}"
            )
        except httpx.TimeoutException:
            sys.exit(f"❌ Timeout conectando a {api_url} (>30s)")
        print("✅ Login OK")

        print("🎫 Emitiendo token MCP...")
        try:
            mcp = _emitir_mcp_token(
                client, api_url, session_token, vigencia, scope, motivo
            )
        except httpx.ConnectError as e:
            sys.exit(f"❌ Conexión perdida durante la emisión del token: {e}")
        except httpx.TimeoutException:
            sys.exit("❌ Timeout emitiendo el token MCP")
        print("✅ Token MCP emitido")
        print(f"   jti:     {mcp['jti']}")
        print(f"   scope:   {mcp['scope']}")
        print(f"   expira:  {mcp['expires_at']}")
        print(f"   vigencia: {mcp['vigencia_dias']} días")

    print()
    print("¿Dónde guardar el token?")
    print("  1. Keyring del SO (recomendado — Windows Credential Manager /")
    print("     macOS Keychain / Linux Secret Service)")
    print("  2. Mostrar y copiar manualmente")
    opcion = input("Opción [1]: ").strip() or "1"

    if opcion == "1":
        nombre_default = f"gpm_mcp_{cedula}"
        nombre = input(
            f"Nombre lógico (default '{nombre_default}'): "
        ).strip() or nombre_default
        _guardar_en_keyring(nombre, mcp["access_token"])
        print(f"\n✅ Guardado en keyring como '{nombre}'")
        print()
        print("Para usar, configura tu cliente MCP (Claude Desktop / Cursor):")
        print('  "mcpServers": {')
        print('    "gestor-proyectos-ti": {')
        print('      "command": "uv",')
        print('      "args": [')
        print('        "run",')
        print('        "--with", "mcp",')
        print('        "--with", "httpx",')
        print('        "--with", "keyring",')
        print('        "--with", "python-jose[cryptography]",')
        print(f'        "scripts/mcp/mcp_run.py",')
        print(f'        "{nombre}"')
        print("      ],")
        print(f'      "env": {{ "GPM_JWT_SECRET": "<valor de JWT_SECRET_KEY>" }}')
        print("    }")
        print("  }")
    else:
        print()
        print("⚠️  Token MCP (NO lo compartas por chat/email):")
        print(f"   {mcp['access_token']}")
        print()
        print("Para usarlo: export GPM_TOKEN=<token> antes de invocar")
        print("el servidor MCP, o guárdalo tú mismo en tu keyring.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
