
import pytest
import os

@pytest.mark.asyncio
async def test_login_email_needs_update_flag(client):
    """
    Valida que un usuario que no ha sincronizado su correo
    reciba el flag 'email_needs_update' en true.
    """
    # Usamos la cédula de prueba que sabemos que tiene el flag en False en el ERP
    test_cedula = "1146437946"
    
    response = await client.post("/auth/portal-login", json={"username": test_cedula})
    
    assert response.status_code == 200
    data = response.json()
    
    assert "user" in data
    user = data["user"]
    
    # El flag debe ser TRUE porque el correo no está sincronizado en el ERP
    assert "email_needs_update" in user
    assert user["email_needs_update"] is True
    print(f"DEBUG: email_needs_update recibido: {user['email_needs_update']}")

@pytest.mark.asyncio
async def test_yo_endpoint_consistency(client):
    """
    Valida que el endpoint /yo también devuelva el flag de actualización.
    """
    test_cedula = "1146437946"
    
    # 1. Login para obtener token
    login_res = await client.post("/auth/portal-login", json={"username": test_cedula})
    token = login_res.json()["access_token"]
    
    # 2. Consultar /yo
    response = await client.get("/auth/yo", headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 200
    data = response.json()
    
    assert "email_needs_update" in data
    # En /yo también debería ser True si el usuario no ha actualizado
    assert data["email_needs_update"] is True
