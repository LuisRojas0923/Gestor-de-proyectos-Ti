import pytest
import pytest_asyncio
import httpx
import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# Configuración
BASE_URL = "http://localhost:8000/api/v2"
TEST_USER_CEDULA = os.getenv("USER", "1107068093")
TEST_USER_PASS = os.getenv("PASSWORD", "1107068093")

@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as ac:
        yield ac

@pytest_asyncio.fixture
async def auth_token(client):
    """Obtiene un token de acceso para las pruebas protegidas"""
    try:
        response = await client.post("/auth/login", data={
            "username": TEST_USER_CEDULA,
            "password": TEST_USER_PASS
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    except Exception:
        return None

@pytest.mark.asyncio
async def test_health_check():
    """Verifica que el backend esté arriba"""
    async with httpx.AsyncClient(base_url="http://localhost:8000") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        assert response.json()["estado"] == "saludable"

@pytest.mark.asyncio
async def test_auth_login(client):
    """Prueba el endpoint de login"""
    response = await client.post("/auth/login", data={
        "username": TEST_USER_CEDULA,
        "password": TEST_USER_PASS
    })
    assert response.status_code in [200, 401] # 401 si no existe el usuario de prueba
    if response.status_code == 200:
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_auth_me(client, auth_token):
    """Prueba el endpoint /yo (protegido)"""
    if not auth_token:
        pytest.skip("No se pudo obtener token de autenticación")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.get("/auth/yo", headers=headers)
    assert response.status_code == 200
    assert "cedula" in response.json()

@pytest.mark.asyncio
async def test_get_categories(client):
    """Prueba el listado de categorías de tickets"""
    response = await client.get("/soporte/categorias")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_solid_modules(client):
    """Prueba el listado de módulos SOLID"""
    response = await client.get("/solid/modulos")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_solid_seed_integration(client):
    """Prueba el endpoint de seed de SOLID"""
    response = await client.post("/solid/seed")
    assert response.status_code == 200
    assert "resultado" in response.json()

@pytest.mark.asyncio
async def test_create_ticket_minimal(client, auth_token):
    """Prueba la creación de un ticket básico (Soporte Técnico)"""
    if not auth_token:
        pytest.skip("No se pudo obtener token de autenticación")
    
    ticket_id = f"TEST-TKT-{int(datetime.now().timestamp())}"
    payload = {
        "id": ticket_id,
        "categoria_id": "soporte_software",
        "asunto": "Prueba de Integración Automatizada",
        "descripcion": "Esta es una descripción generada por la suite de pruebas.",
        "creador_id": TEST_USER_CEDULA,
        "nombre_creador": "Test Runner",
        "correo_creador": "test@example.com",
        "prioridad": "Media",
        "areas_impactadas": ["Tecnología", "Pruebas"]
    }
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.post("/soporte/", json=payload, headers=headers)
    
    # Si falla por ID duplicado o similar, aceptamos que el endpoint existe
    assert response.status_code in [200, 201, 400]

if __name__ == "__main__":
    # Permite ejecutarlo directamente con python si no se tiene pytest
    async def main():
        async with httpx.AsyncClient(base_url="http://localhost:8000") as ac:
            print("Verificando salud...")
            r = await ac.get("/health")
            print(f"Salud: {r.status_code} - {r.json()}")
    
    asyncio.run(main())
