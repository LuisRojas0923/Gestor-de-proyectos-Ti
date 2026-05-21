import pytest
import httpx
from app.database import SessionLocal
from sqlalchemy import text

BASE_URL = "http://127.0.0.1:8000/api/v2"

@pytest.fixture(autouse=True)
def setup_user_email_flag():
    db = SessionLocal()
    original_val = True
    try:
        row = db.execute(text("SELECT correo_actualizado FROM usuarios WHERE cedula = '94041597'")).fetchone()
        if row is not None:
            original_val = row[0]
            db.execute(text("UPDATE usuarios SET correo_actualizado = False WHERE cedula = '94041597'"))
            db.commit()
        yield
        if row is not None:
            db.execute(text("UPDATE usuarios SET correo_actualizado = :val WHERE cedula = '94041597'"), {"val": original_val})
            db.commit()
    finally:
        db.close()

@pytest.mark.asyncio
async def test_login_email_needs_update_flag():
    """
    Valida que un usuario que no ha sincronizado su correo
    reciba el flag 'email_needs_update' en true.
    """
    test_cedula = "94041597"
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        response = await client.post("/auth/portal-login", json={"username": test_cedula})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        user = data["user"]
        
        # El flag debe ser TRUE porque el correo no está sincronizado en el ERP
        assert "email_needs_update" in user
        print(f"DEBUG: VALOR RECIBIDO: {user['email_needs_update']}")
        assert user["email_needs_update"] is True

@pytest.mark.asyncio
async def test_yo_endpoint_consistency():
    """
    Valida que el endpoint /yo también devuelva el flag de actualización.
    """
    test_cedula = "94041597"
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # 1. Login para obtener token
        login_res = await client.post("/auth/portal-login", json={"username": test_cedula})
        token = login_res.json()["access_token"]
        
        # 2. Consultar /yo
        response = await client.get("/auth/yo", headers={"Authorization": f"Bearer {token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "email_needs_update" in data
        assert data["email_needs_update"] is True
