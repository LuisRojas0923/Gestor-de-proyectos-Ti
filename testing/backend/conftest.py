import sys
import pytest
import pytest_asyncio
import httpx
import os
import asyncio
import json
import socket
import warnings
import builtins
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Forzar UTF-8 en stdout/stderr ANTES de que pytest intente imprimir nada.
# Windows usa cp1252 por defecto y falla con caracteres españoles (ñ, tildes, etc.)
# que aparecen en docstrings, prints o tracebacks de los tests.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    # Python < 3.7 o streams redirigidos sin reconfigure
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)

# Forzar encoding UTF-8 en open() built-in ANTES de que slowapi/starlette
# importen el .env. En Windows, open() sin encoding usa cp1252 y falla al leer
# archivos UTF-8 con caracteres no-ASCII (tildes, ñ, símbolos). Esto es solo
# para tests: en Docker (Linux) el default ya es UTF-8.
_real_open = builtins.open


def _open_utf8(file, mode="r", buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None):
    if "b" not in mode and encoding is None:
        encoding = "utf-8"
        if errors is None:
            errors = "replace"
    return _real_open(file, mode, buffering, encoding, errors, newline, closefd, opener)


builtins.open = _open_utf8

# Cargar .env.test primero (tiene DB_HOST=localhost para tests locales),
# luego el .env del backend como fallback.
_env_test = Path(__file__).parent / ".env.test"
_env_backend = Path(__file__).parent.parent.parent / "backend_v2" / ".env"
load_dotenv(_env_test)
load_dotenv(_env_backend)  # fallback para vars no definidas en .env.test

# Suprimir DeprecationWarning del legacy app.config en el contexto de tests.
# La migración completa a app.core.config está pendiente (Fase 4); mientras
# tanto evitamos ruido en cada test que use el config legacy.
warnings.filterwarnings("ignore", category=DeprecationWarning, module="app.config")

from app.config import config
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool


# ---------------------------------------------------------------------------
# F5.0 — Fixtures de seguridad de RAM (Fase 5 del plan de hardening)
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def limiter_reset():
    """
    Limpia el estado en memoria del rate limiter (slowapi) entre tests.

    slowapi guarda un dict {key: timestamps} en el Limiter singleton. Sin
    reset, las keys de tests anteriores contaminan los buckets de los
    siguientes, lo que puede causar falsos 429 e incluso crecimiento
    descontrolado de memoria en sesiones largas.

    En el rate limiter nuevo, el storage es Redis. Si Redis no esta
    disponible (tests unitarios locales), swallow-eamos el error: los
    tests no deben requerir infra externa para correr.
    """
    from app.core.rate_limiter import limiter
    limiter.enabled = False
    try:
        limiter.reset()
    except Exception:
        # Redis caido o no disponible: el test sigue, solo no resetea buckets.
        pass
    yield
    try:
        limiter.reset()
    except Exception:
        pass


@pytest.fixture(scope="session", autouse=True)
def bcrypt_fast():
    """
    Reduce bcrypt rounds a 4 SOLO durante los tests.

    bcrypt default es rounds=12 (~250ms por hash + ~50MB pico). En tests
    con muchos usuarios creados (race condition, approval) eso se acumula
    y dispara el uso de CPU/RAM. rounds=4 baja a ~6ms (40x más rápido)
    con el coste de hashes de baja entropía — aceptable porque estos
    hashes NUNCA se persisten en producción: el test crea y borra.
    """
    import bcrypt
    _original_gensalt = bcrypt.gensalt

    def _fast_gensalt(rounds=4, prefix=b"2b"):
        return _original_gensalt(rounds=4, prefix=prefix)

    bcrypt.gensalt = _fast_gensalt
    yield
    bcrypt.gensalt = _original_gensalt


@pytest.fixture(scope="session")
def require_docker():
    """
    Marca el test como skipped si el backend no está disponible.

    Usado por integration tests (test_jit_race.py) para evitar fallos
    ruidosos en máquinas de devs que no tienen docker compose levantado.
    Los unit tests NO deben usar este fixture.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    reachable = sock.connect_ex(("127.0.0.1", 8000)) == 0
    sock.close()
    if not reachable:
        import pytest
        pytest.skip("Backend no disponible en 127.0.0.1:8000 (requiere Docker compose up)")


# ---------------------------------------------------------------------------
# Fixtures originales (sin cambios)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="function")
async def db_session():
    """
    Fixture de sesión de DB para tests.
    Usa NullPool para evitar el error 'Event loop is closed' entre tests:
    el pool compartido del motor principal retiene conexiones del event loop
    anterior, fallando en el siguiente test. NullPool crea y cierra una
    conexión fresca por cada fixture, eliminando el problema.
    """
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()

# Configuración centralizada
BASE_URL = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000/api/v2")

@pytest_asyncio.fixture(scope="function")
async def client():
    """
    Fixture centralizado para clientes HTTP asíncronos.
    Ajustado para prevenir 'ConnectError' mediante:
    1. Uso de 127.0.0.1 en lugar de localhost (más rápido en Windows).
    2. Tiempo de espera (timeout) aumentado a 60s.
    """
    limits = httpx.Limits(max_connections=50, max_keepalive_connections=20)

    async with httpx.AsyncClient(
        base_url=BASE_URL,
        timeout=60.0,
        limits=limits,
        follow_redirects=True
    ) as ac:
        yield ac
        # Pequeña pausa para permitir liberación de sockets
        await asyncio.sleep(0.01)

@pytest_asyncio.fixture(scope="function")
async def auth_token(client):
    """
    Fixture centralizado de autenticación.
    """
    user_cedula = os.getenv("TEST_USER_CEDULA", "1107068093")
    user_pass = os.getenv("TEST_USER_PASS", "1107068093")

    try:
        response = await client.post("/auth/login", data={
            "username": user_cedula,
            "password": user_pass
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        print(f"DEBUG: Auth failed with status {response.status_code}: {response.text}")
        return None
    except Exception as e:
        print(f"DEBUG: Auth exception: {str(e)}")
        return None

def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """
    Hook de Pytest que se ejecuta al finalizar la sesin de pruebas.
    Genera un informe detallado en la carpeta testing/logs/.
    """
    # Crear carpeta de logs si no existe (por seguridad)
    log_dir = Path("testing/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Datos del informe
    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
    report_filename = log_dir / f"test_report_{timestamp}.log"
    
    # Resumen de resultados
    passed = len(terminalreporter.stats.get('passed', []))
    failed = len(terminalreporter.stats.get('failed', []))
    skipped = len(terminalreporter.stats.get('skipped', []))
    error = len(terminalreporter.stats.get('error', []))
    total = passed + failed + skipped + error
    
    # Identificar mdulos probados
    modules = set()
    for key in terminalreporter.stats:
        for report in terminalreporter.stats[key]:
            if hasattr(report, 'fspath'):
                modules.add(os.path.basename(report.fspath))

    with open(report_filename, "w", encoding="utf-8") as f:
        f.write("="*60 + "\n")
        f.write(f"📊 INFORME DE EJECUCION DE PRUEBAS - GESTOR TI\n")
        f.write("="*60 + "\n")
        f.write(f"Fecha/Hora: {now.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Estado Final: {'EXITO' if exitstatus == 0 else 'FALLO'}\n")
        f.write("-"*60 + "\n")
        f.write(f"Resumen de Resultados:\n")
        f.write(f"  ✅ Pasados:   {passed}\n")
        f.write(f"  ❌ Fallidos:  {failed}\n")
        f.write(f"  ⚠️ Saltados:  {skipped}\n")
        f.write(f"  🔥 Errores:   {error}\n")
        f.write(f"  📦 Total:     {total}\n")
        f.write("-"*60 + "\n")
        f.write(f"Modulos Evaluados:\n")
        for module in sorted(list(modules)):
            f.write(f"  • {module}\n")
        f.write("="*60 + "\n")
        
        # Si hubo fallos, listar los tests fallidos
        if failed > 0:
            f.write("\nDetalle de Fallos:\n")
            for rep in terminalreporter.stats.get('failed', []):
                f.write(f"  ❌ {rep.nodeid}\n")
            f.write("\n" + "="*60 + "\n")

    print(f"\n[REPORT] Informe de pruebas generado en: {report_filename}")
