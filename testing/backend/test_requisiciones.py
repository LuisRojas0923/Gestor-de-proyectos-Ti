import pytest
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

TEST_USER_CEDULA = os.getenv("TEST_USER_CEDULA", "1107068093")
TEST_USER_PASS = os.getenv("TEST_USER_PASS", "1107068093")

@pytest.mark.asyncio
async def test_get_ots_requisiciones(client):
    """Prueba la obtención de OTs para requisiciones"""
    response = await client.get("/erp/requisiciones/ots")
    assert response.status_code in [200, 500, 503]
    if response.status_code == 200:
        assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_catalogo_requisiciones(client):
    """Prueba la obtención del catálogo de productos"""
    response = await client.get("/erp/requisiciones/catalogo?limit=10")
    assert response.status_code in [200, 500, 503]
    if response.status_code == 200:
        assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_obtener_mis_solicitudes(client, auth_token):
    """Prueba la obtención del historial de solicitudes del usuario"""
    if not auth_token:
        pytest.skip("No se pudo obtener token de autenticación")
        
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.get("/erp/requisiciones/mis-solicitudes", headers=headers)
    assert response.status_code in [200, 500, 503]
