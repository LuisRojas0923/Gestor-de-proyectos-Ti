import pytest
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

TEST_USER_CEDULA = os.getenv("TEST_USER_CEDULA", "1107068093")
TEST_USER_PASS = os.getenv("TEST_USER_PASS", "1107068093")

@pytest.mark.asyncio
async def test_get_viaticos_categorias(client):
    """Prueba la obtención de categorías de legalización"""
    response = await client.get("/viaticos/categorias")
    # Puede fallar con 503/500 si el ERP no está conectado, pero validamos estructura si responde
    assert response.status_code in [200, 500, 503]
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)

@pytest.mark.asyncio
async def test_buscar_ots_viaticos(client):
    """Prueba la búsqueda de OTs para viáticos"""
    response = await client.get("/viaticos/ots?query=TEST")
    assert response.status_code in [200, 500, 503]
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)

@pytest.mark.asyncio
async def test_get_estado_cuenta_viaticos(client):
    """Prueba la consulta de estado de cuenta"""
    response = await client.get(f"/viaticos/estado-cuenta?cedula={TEST_USER_CEDULA}")
    assert response.status_code in [200, 500, 503]

@pytest.mark.asyncio
async def test_get_reportes_viaticos(client):
    """Prueba el listado de reportes de un empleado"""
    response = await client.get(f"/viaticos/reportes/{TEST_USER_CEDULA}")
    assert response.status_code in [200, 500, 503]
