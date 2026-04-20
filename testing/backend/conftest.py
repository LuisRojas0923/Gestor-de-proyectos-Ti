import pytest_asyncio
import httpx
import os
import asyncio
from dotenv import load_dotenv
from app.database import AsyncSessionLocal

@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Fixture para obtener una sesion de base de datos real para los tests"""
    async with AsyncSessionLocal() as session:
        yield session

# Cargar variables de entorno una sola vez para toda la suite
load_dotenv()

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
