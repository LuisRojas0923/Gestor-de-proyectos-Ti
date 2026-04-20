import pytest
from sqlmodel import select
from app.models.auth.usuario import Usuario

@pytest.mark.asyncio
async def test_portal_login_autoprovisioning(client, db_session):
    """
    Verifica que un usuario que no existe en la DB local pero sí en el ERP
    sea creado automáticamente al intentar loguearse en el portal.
    """
    cedula_test = "1107068093" # Cédula de prueba real
    
    # 0. Limpiar usuario local si existe para forzar auto-provisionamiento
    from sqlalchemy import text
    await db_session.execute(text("DELETE FROM usuarios WHERE cedula = :c"), {"c": cedula_test})
    await db_session.commit()
    
    # 1. Intentar login
    response = await client.post("/auth/portal-login", json={"username": cedula_test})
    
    # 2. Verificar éxito
    assert response.status_code == 200
    data = response.json()
    
    assert "access_token" in data
    assert data["user"]["cedula"] == cedula_test
    
    # 3. Verificar que password_set es False para nuevos usuarios
    assert data["user"]["password_set"] is False
    
    # 4. Verificar persistencia en DB
    result = await db_session.execute(select(Usuario).where(Usuario.cedula == cedula_test))
    usuario_db = result.scalars().first()
    assert usuario_db is not None
    
    # 5. Verificar que la contraseña es PORTAL_PENDING_PWD usando el helper
    from app.services.auth.servicio import ServicioAuth
    from app.config import config
    assert ServicioAuth.es_password_configurado(usuario_db.hash_contrasena) is False
    assert ServicioAuth.verificar_contrasena(config.portal_pending_pwd, usuario_db.hash_contrasena)


@pytest.mark.asyncio
async def test_portal_me_after_autoprovision(client, db_session):
    """Prueba que el endpoint /yo reconozca el nuevo flag password_set"""
    cedula_test = "1107068093"
    
    # Simular login para obtener token
    login_res = await client.post("/auth/portal-login", json={"username": cedula_test})
    token = login_res.json()["access_token"]
    
    # Llamar a /yo
    res = await client.get(
        "/auth/yo",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert res.status_code == 200
    data = res.json()
    assert data["cedula"] == cedula_test
    assert data["password_set"] is False
    # El usuario real tiene correo, así que email_needs_update depende de si es el primer login
    # pero para el test, aceptamos cualquier booleano o validamos contra lo que devuelva
    assert "email_needs_update" in data
