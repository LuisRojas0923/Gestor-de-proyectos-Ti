import pytest_asyncio
import httpx
import os
import asyncio
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env.test primero (tiene DB_HOST=localhost para tests locales),
# luego el .env del backend como fallback.
_env_test = Path(__file__).parent / ".env.test"
_env_backend = Path(__file__).parent.parent.parent / "backend_v2" / ".env"
load_dotenv(_env_test)
load_dotenv(_env_backend)  # fallback para vars no definidas en .env.test

from app.config import config
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

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
