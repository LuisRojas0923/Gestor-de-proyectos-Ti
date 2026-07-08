import pytest
import pytest_asyncio
from datetime import datetime
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth
from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario
from sqlalchemy import delete

@pytest_asyncio.fixture(scope="function")
async def db_session():
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        yield session

@pytest.mark.asyncio
async def test_auditar_descarga_viaticos_cache(client, db_session):
    user_id = "test-auditor-viaticos"
    cedula_prueba = "1234567890"
    
    # 1. Crear e insertar un usuario de prueba para aislar el test del ERP externo.
    # Usamos commit() para que sea visible por el servidor de FastAPI en Docker.
    test_user = Usuario(
        id=user_id,
        cedula=cedula_prueba,
        correo="test_auditor_viaticos@empresa.com",
        hash_contrasena="nopass",
        nombre="Usuario Test Auditoria Viaticos",
        rol="usuario",
        esta_activo=True,
        area="Sistemas",
        sede="Sede Central",
        cargo="Analista",
        centrocosto="TI-01"
    )
    
    # Limpiar por si quedó algún registro huérfano de pruebas fallidas previas
    await db_session.execute(delete(Usuario).where(Usuario.id == user_id))
    await db_session.execute(delete(AuditoriaAccionUsuario).where(AuditoriaAccionUsuario.usuario_id == user_id))
    await db_session.commit()
    
    db_session.add(test_user)
    await db_session.commit()
    
    try:
        # 2. Generar token de sesión con "sub" igual a la cédula del usuario insertado
        token = ServicioAuth.crear_token_acceso(
            datos={"sub": cedula_prueba, "rol": "usuario"}
        )
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Primera llamada para PDF: Debe registrar el evento y retornar "logged"
        response = await client.post(
            "/viaticos/estado-cuenta/auditar-descarga",
            json={
                "tipo_archivo": "pdf",
                "cedula_consultada": "9876543210",
                "nombre_consultado": "GIL MOSQUERA JHON EDWARD"
            },
            headers=headers
        )
        assert response.status_code == 200
        assert response.json()["status"] == "logged"
        
        # Verificar que se persistieron los metadatos en la base de datos
        from sqlalchemy import select
        result = await db_session.execute(
            select(AuditoriaAccionUsuario).where(
                AuditoriaAccionUsuario.usuario_id == user_id,
                AuditoriaAccionUsuario.ruta == "/api/v2/viaticos/estado-cuenta/pdf"
            )
        )
        log_db = result.scalar_one()
        assert log_db.metadatos is not None
        assert log_db.metadatos["nombre_consultado"] == "GIL MOSQUERA JHON EDWARD"
        assert log_db.metadatos["cedula_consultada"] == "9876543210"
        
        # 4. Segunda llamada inmediata para PDF: Debe retornar "cached" para evitar duplicados
        response2 = await client.post(
            "/viaticos/estado-cuenta/auditar-descarga",
            json={
                "tipo_archivo": "pdf",
                "cedula_consultada": "9876543210",
                "nombre_consultado": "GIL MOSQUERA JHON EDWARD"
            },
            headers=headers
        )
        assert response2.status_code == 200
        assert response2.json()["status"] == "cached"
        
        # 5. Llamada para XLSX (distinto tipo): Debe registrar el evento ("logged")
        response3 = await client.post(
            "/viaticos/estado-cuenta/auditar-descarga",
            json={
                "tipo_archivo": "xlsx",
                "cedula_consultada": "9876543210",
                "nombre_consultado": "GIL MOSQUERA JHON EDWARD"
            },
            headers=headers
        )
        assert response3.status_code == 200
        assert response3.json()["status"] == "logged"
        
        # 6. Segunda llamada inmediata para XLSX: Debe retornar "cached"
        response4 = await client.post(
            "/viaticos/estado-cuenta/auditar-descarga",
            json={
                "tipo_archivo": "xlsx",
                "cedula_consultada": "9876543210",
                "nombre_consultado": "GIL MOSQUERA JHON EDWARD"
            },
            headers=headers
        )
        assert response4.status_code == 200
        assert response4.json()["status"] == "cached"
        
    finally:
        # Limpiar base de datos
        await db_session.execute(delete(Usuario).where(Usuario.id == user_id))
        await db_session.execute(delete(AuditoriaAccionUsuario).where(AuditoriaAccionUsuario.usuario_id == user_id))
        await db_session.commit()
