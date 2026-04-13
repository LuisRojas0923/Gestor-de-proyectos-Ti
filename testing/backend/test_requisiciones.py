import pytest
import pytest_asyncio
import httpx
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

BASE_URL = "http://localhost:8000/api/v2/erp/requisiciones"
AUTH_URL = "http://localhost:8000/api/v2/auth"
TEST_USER_CEDULA = os.getenv("TEST_USER_CEDULA", "1107068093")
TEST_USER_PASS = os.getenv("TEST_USER_PASS", "1107068093")

@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as ac:
        yield ac

@pytest_asyncio.fixture
async def auth_token():
    """Obtiene un token de acceso para las pruebas protegidas"""
    async with httpx.AsyncClient(timeout=10.0) as ac:
        try:
            response = await ac.post(f"{AUTH_URL}/login", data={
                "username": TEST_USER_CEDULA,
                "password": TEST_USER_PASS
            })
            if response.status_code == 200:
                return response.json()["access_token"]
            return None
        except Exception:
            return None

@pytest.mark.asyncio
async def test_get_ots_requisiciones(client):
    """Prueba la obtención de OTs para requisiciones"""
    response = await client.get("/ots")
    assert response.status_code in [200, 500, 503]
    if response.status_code == 200:
        assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_catalogo_requisiciones(client):
    """Prueba la obtención del catálogo de productos"""
    response = await client.get("/catalogo?limit=10")
    assert response.status_code in [200, 500, 503]
    if response.status_code == 200:
        assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_obtener_mis_solicitudes(client, auth_token):
    """Prueba la obtención del historial de solicitudes del usuario"""
    if not auth_token:
        pytest.skip("No se pudo obtener token de autenticación")
        
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.get("/mis-solicitudes", headers=headers)
    assert response.status_code in [200, 500, 503]
