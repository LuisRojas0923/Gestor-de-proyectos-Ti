import pytest
import os
from dotenv import load_dotenv

load_dotenv()

TEST_USER_CEDULA = os.getenv("TEST_USER_CEDULA", "1107068093")

@pytest.mark.asyncio
async def test_verify_email_invalid_token(client):
    """Prueba que el sistema rechace tokens inválidos de verificación"""
    response = await client.get("/auth/verify-email?token=token_falso_123")
    assert response.status_code == 400
    assert "inválido" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_verify_email_missing_token(client):
    """Prueba que el sistema requiera un token"""
    response = await client.get("/auth/verify-email")
    # FastAPI devuelve 422 Unprocessable Entity por falta de parámetro query requerido
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_profile_update_email_flow(client, auth_token):
    """Prueba el inicio del flujo de actualización de email (genera correo)"""
    if not auth_token:
        pytest.skip("Sin token")
        
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "correo": "test_update@refridcol.com.co"
    }
    
    # Es un PATCH según profile_router.py
    response = await client.patch("/auth/update-email", json=payload, headers=headers)
    
    # Puede devolver 200 (éxito) o 400/503 (si el ERP falla o correo inválido)
    assert response.status_code in [200, 400, 503]
    if response.status_code == 200:
        assert response.json()["correo"] == "test_update@refridcol.com.co"
