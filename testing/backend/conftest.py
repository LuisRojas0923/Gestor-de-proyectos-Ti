import pytest_asyncio
import httpx
import os
import asyncio
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
