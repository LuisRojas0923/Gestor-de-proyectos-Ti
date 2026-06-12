"""
Tests del wrapper mcp_run.py (Fase 3).

Estrategia: cargar mcp_run como módulo, mockear keyring/subprocess,
y ejecutar main() en proceso (más rápido que subprocesar).

Para los casos de borde (sin args, módulo corrupto) usamos subproceso
con encoding utf-8 explícito.

No requiere keyring instalado (mockeado), ni mcp_server.py presente.

Ejecutar:
    PYTHONIOENCODING=utf-8 python scripts/mcp/test_mcp_run.py
"""
import io
import os
import sys
import importlib.util
from pathlib import Path
from unittest import mock

SCRIPT = Path(__file__).resolve().parent / "mcp_run.py"


def _cargar_modulo():
    """Carga mcp_run.py como módulo. Asume keyring disponible."""
    spec = importlib.util.spec_from_file_location("mcp_run_test", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def t1_sin_argumentos_rc_1():
    """Sin args -> rc=1, stderr explica uso."""
    mod = _cargar_modulo()
    old_argv, old_stderr = sys.argv, sys.stderr
    sys.argv = ["mcp_run.py"]
    sys.stderr = io.StringIO()
    try:
        rc = mod.main()
    finally:
        stderr_val = sys.stderr.getvalue()
        sys.argv, sys.stderr = old_argv, old_stderr
    ok = rc == 1 and "Uso:" in stderr_val and "mcp_token_cli.py" in stderr_val
    print(f"{'OK' if ok else 'FAIL'} T1 sin args: rc={rc}")
    if not ok:
        print(f"   stderr: {stderr_val[:300]}")
    return ok


def t2_token_ausente_en_keyring():
    """Token no en keyring -> rc=1, mensaje claro."""
    mod = _cargar_modulo()
    old_argv, old_stderr = sys.argv, sys.stderr
    sys.argv = ["mcp_run.py", "gpm_mcp_inexistente_test"]
    sys.stderr = io.StringIO()
    try:
        with mock.patch.object(mod, "_leer_token", return_value=None):
            rc = mod.main()
    finally:
        stderr_val = sys.stderr.getvalue()
        sys.argv, sys.stderr = old_argv, old_stderr
    ok = rc == 1 and "No se encontro token" in stderr_val
    print(f"{'OK' if ok else 'FAIL'} T2 token_ausente: rc={rc}")
    if not ok:
        print(f"   stderr: {stderr_val[:300]}")
    return ok


def t3_token_vacio_o_none():
    """Si _leer_token retorna string vacio -> tambien es tratado como ausente."""
    mod = _cargar_modulo()
    old_argv, old_stderr = sys.argv, sys.stderr
    sys.argv = ["mcp_run.py", "gpm_mcp_vacio"]
    sys.stderr = io.StringIO()
    try:
        with mock.patch.object(mod, "_leer_token", return_value=""):
            rc = mod.main()
    finally:
        stderr_val = sys.stderr.getvalue()
        sys.argv, sys.stderr = old_argv, old_stderr
    ok = rc == 1 and "No se encontro token" in stderr_val
    print(f"{'OK' if ok else 'FAIL'} T3 token_vacio: rc={rc}")
    return ok


def t4_main_pasa_token_via_env():
    """Token valido + mcp_server.py existente -> spawna subprocess con env."""
    mod = _cargar_modulo()
    token_falso = "eyJhbGciOiJIUzI1NiJ9.FAKE.SIGNATURE"
    nombre_logico = "gpm_mcp_test_env"
    old_argv, old_stderr, old_stdout = sys.argv, sys.stderr, sys.stdout
    sys.argv = ["mcp_run.py", nombre_logico]
    sys.stderr, sys.stdout = io.StringIO(), io.StringIO()
    try:
        with mock.patch.object(mod, "_leer_token", return_value=token_falso), \
             mock.patch("subprocess.run") as m_run, \
             mock.patch.object(Path, "exists", return_value=True):
            m_run.return_value = mock.Mock(returncode=0)
            rc = mod.main()
    finally:
        stdout_val = sys.stdout.getvalue()
        stderr_val = sys.stderr.getvalue()
        sys.argv, sys.stderr, sys.stdout = old_argv, old_stderr, old_stdout

    if rc != 0:
        print(f"FAIL T4 main_env: rc={rc}")
        print(f"   stderr: {stderr_val[:200]}")
        return False
    if m_run.call_count != 1:
        print(f"FAIL T4 main_env: subprocess.run llamado {m_run.call_count} veces")
        return False

    call = m_run.call_args
    cmd = call.args[0]
    env_pasado = call.kwargs.get("env", {})

    checks = []
    if token_falso not in cmd:
        checks.append("token NO en argv")
    if env_pasado.get("GPM_TOKEN") == token_falso:
        checks.append("GPM_TOKEN correcto")
    if env_pasado.get("GPM_TOKEN_NAME") == nombre_logico:
        checks.append("GPM_TOKEN_NAME correcto")
    if "GPM_KEYRING_BACKEND" in env_pasado:
        checks.append(f"GPM_KEYRING_BACKEND={env_pasado['GPM_KEYRING_BACKEND']}")
    if token_falso not in stdout_val and token_falso not in stderr_val:
        checks.append("token NO impreso en stdout/stderr")
    if env_pasado is not os.environ:
        checks.append("env es copia (no os.environ directo)")

    for c in checks:
        print(f"   + {c}")
    ok = len(checks) == 6
    print(f"{'OK' if ok else 'FAIL'} T4 main_env: {len(checks)}/6 verificaciones")
    return ok


def t5_subprocess_no_encontrado():
    """subprocess.run lanza FileNotFoundError -> rc=1, mensaje claro."""
    mod = _cargar_modulo()
    old_argv, old_stderr = sys.argv, sys.stderr
    sys.argv = ["mcp_run.py", "gpm_mcp_x"]
    sys.stderr = io.StringIO()
    try:
        with mock.patch.object(mod, "_leer_token", return_value="TOKEN_OK"), \
             mock.patch.object(Path, "exists", return_value=True), \
             mock.patch("subprocess.run",
                        side_effect=FileNotFoundError("Python o mcp_server.py no encontrado")):
            rc = mod.main()
    finally:
        stderr_val = sys.stderr.getvalue()
        sys.argv, sys.stderr = old_argv, old_stderr
    ok = rc == 1 and ("Python o mcp_server.py no encontrado" in stderr_val or "no encontrado" in stderr_val)
    print(f"{'OK' if ok else 'FAIL'} T5 subprocess_no_encontrado: rc={rc}")
    if not ok:
        print(f"   stderr: {stderr_val[:300]}")
    return ok


def t6_keyring_backend_detection():
    """_detectar_keyring_backend() retorna string, maneja excepciones."""
    mod = _cargar_modulo()

    fake_kr = mock.Mock()
    fake_kr.__class__.__name__ = "WindowsCredentialVaultKeyring"
    with mock.patch("keyring.get_keyring", return_value=fake_kr):
        r1 = mod._detectar_keyring_backend()
    ok1 = r1 == "WindowsCredentialVaultKeyring"

    with mock.patch("keyring.get_keyring", side_effect=Exception("boom")):
        r2 = mod._detectar_keyring_backend()
    ok2 = "error" in r2

    ok = ok1 and ok2
    print(f"{'OK' if ok else 'FAIL'} T6 keyring_backend: ok_func={ok1}, ok_err={ok2}")
    print(f"   funcional: {r1}")
    print(f"   con error: {r2}")
    return ok


def t7_keyring_service_constante():
    """KEYRING_SERVICE coincide entre mcp_run.py y mcp_token_cli.py."""
    mod_run = _cargar_modulo()
    spec_cli = importlib.util.spec_from_file_location(
        "mcp_token_cli_t7", Path(SCRIPT).parent / "mcp_token_cli.py"
    )
    mod_cli = importlib.util.module_from_spec(spec_cli)
    spec_cli.loader.exec_module(mod_cli)
    ok = mod_run.KEYRING_SERVICE == mod_cli.KEYRING_SERVICE == "gestor-proyectos-ti-mcp"
    print(f"{'OK' if ok else 'FAIL'} T7 KEYRING_SERVICE: {mod_run.KEYRING_SERVICE}")
    return ok


def t8_mcp_server_ausente_en_paquete():
    """Si mcp_server.py NO existe, wrapper debe detectar y abortar con mensaje claro."""
    mod = _cargar_modulo()
    old_argv, old_stderr = sys.argv, sys.stderr
    sys.argv = ["mcp_run.py", "gpm_mcp_x"]
    sys.stderr = io.StringIO()
    try:
        with mock.patch.object(mod, "_leer_token", return_value="TOKEN_OK"), \
             mock.patch.object(Path, "exists", return_value=False):
            rc = mod.main()
    finally:
        stderr_val = sys.stderr.getvalue()
        sys.argv, sys.stderr = old_argv, old_stderr
    ok = rc == 1 and "No se encontro mcp_server.py" in stderr_val
    print(f"{'OK' if ok else 'FAIL'} T8 mcp_server_ausente: rc={rc}")
    if not ok:
        print(f"   stderr: {stderr_val[:300]}")
    return ok


def t9_keyboard_interrupt_retorna_130():
    """KeyboardInterrupt del subproceso -> rc=130 (convención Unix)."""
    mod = _cargar_modulo()
    old_argv, old_stderr = sys.argv, sys.stderr
    sys.argv = ["mcp_run.py", "gpm_mcp_x"]
    sys.stderr = io.StringIO()
    try:
        with mock.patch.object(mod, "_leer_token", return_value="TOKEN_OK"), \
             mock.patch("subprocess.run", side_effect=KeyboardInterrupt()), \
             mock.patch.object(Path, "exists", return_value=True):
            rc = mod.main()
    finally:
        stderr_val = sys.stderr.getvalue()
        sys.argv, sys.stderr = old_argv, old_stderr
    ok = rc == 130
    print(f"{'OK' if ok else 'FAIL'} T9 KeyboardInterrupt: rc={rc}")
    return ok


def t10_env_no_contamina_os_environ():
    """GPM_TOKEN del wrapper no debe filtrarse al proceso padre (cliente MCP)."""
    mod = _cargar_modulo()
    nombre_logico = "gpm_mcp_pollution_test"
    old_argv, old_stderr, old_stdout = sys.argv, sys.stderr, sys.stdout
    sys.argv = ["mcp_run.py", nombre_logico]
    sys.stderr, sys.stdout = io.StringIO(), io.StringIO()
    # GPM_TOKEN no debe estar en el ambiente del wrapper
    gpm_token_antes = os.environ.get("GPM_TOKEN")
    try:
        with mock.patch.object(mod, "_leer_token", return_value="LEAKED_TOKEN"), \
             mock.patch("subprocess.run") as m_run, \
             mock.patch.object(Path, "exists", return_value=True):
            m_run.return_value = mock.Mock(returncode=0)
            mod.main()
    finally:
        sys.argv, sys.stderr, sys.stdout = old_argv, old_stderr, old_stdout
    gpm_token_despues = os.environ.get("GPM_TOKEN")
    ok = gpm_token_antes == gpm_token_despues
    print(f"{'OK' if ok else 'FAIL'} T10 no_pollution: os.environ['GPM_TOKEN'] antes/ despues: {gpm_token_antes!r}/{gpm_token_despues!r}")
    return ok


def main():
    print("=" * 70)
    print("Tests mcp_run.py (Fase 3)")
    print("=" * 70)

    tests = [
        t1_sin_argumentos_rc_1,
        t2_token_ausente_en_keyring,
        t3_token_vacio_o_none,
        t4_main_pasa_token_via_env,
        t5_subprocess_no_encontrado,
        t6_keyring_backend_detection,
        t7_keyring_service_constante,
        t8_mcp_server_ausente_en_paquete,
        t9_keyboard_interrupt_retorna_130,
        t10_env_no_contamina_os_environ,
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
    sys.exit(main())
