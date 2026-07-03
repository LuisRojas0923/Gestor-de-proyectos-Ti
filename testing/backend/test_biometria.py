import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.auth.usuario import Usuario
from app.models.biometria.biometria_models import EmbeddingFacial

pytestmark = pytest.mark.asyncio

async def test_reset_rostro_admin_success(async_client: AsyncClient, admin_token_headers: dict, test_db: AsyncSession, admin_user: Usuario):
    # Setup: Create a dummy embedding
    embedding = EmbeddingFacial(
        usuario_id=admin_user.id,
        embedding=[0.1, 0.2, 0.3],
        activo=True
    )
    test_db.add(embedding)
    await test_db.commit()

    # Act
    response = await async_client.delete(f"/api/v2/biometria/admin/reset-rostro/{admin_user.id}", headers=admin_token_headers)
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"

    # Verify deleted
    stmt = select(EmbeddingFacial).where(EmbeddingFacial.usuario_id == admin_user.id)
    result = await test_db.execute(stmt)
    assert result.scalar_one_or_none() is None

async def test_reset_rostro_not_found(async_client: AsyncClient, admin_token_headers: dict, test_db: AsyncSession):
    # Act: try to reset a user that has no face
    response = await async_client.delete("/api/v2/biometria/admin/reset-rostro/no_existe", headers=admin_token_headers)
    
    # Assert
    assert response.status_code == 404
    data = response.json()
    assert "no tiene un rostro enrolado" in data["detail"].lower()

async def test_reset_rostro_forbidden(async_client: AsyncClient, normal_user_token_headers: dict, test_db: AsyncSession, normal_user: Usuario):
    # Setup: Create a dummy embedding
    embedding = EmbeddingFacial(
        usuario_id=normal_user.id,
        embedding=[0.1, 0.2, 0.3],
        activo=True
    )
    test_db.add(embedding)
    await test_db.commit()

    # Act: normal user tries to reset their own face (or someone else's)
    response = await async_client.delete(f"/api/v2/biometria/admin/reset-rostro/{normal_user.id}", headers=normal_user_token_headers)
    
    # Assert
    assert response.status_code == 403
    data = response.json()
    assert "no tienes permisos" in data["detail"].lower()

    # Verify NOT deleted
    stmt = select(EmbeddingFacial).where(EmbeddingFacial.usuario_id == normal_user.id)
    result = await test_db.execute(stmt)
    assert result.scalar_one_or_none() is not None

async def test_obtener_asistencias_con_datos_usuario(async_client: AsyncClient, admin_token_headers: dict, test_db: AsyncSession, admin_user: Usuario):
    from app.models.biometria.biometria_models import RegistroAsistencia
    # Setup: Create a dummy checkin record
    registro = RegistroAsistencia(
        usuario_id=admin_user.id,
        zona_id=None,
        match_exitoso=True,
        nivel_confianza=98.5,
        latitud_marcada=4.6097,
        longitud_marcada=-74.0817,
        evidencia_url="/api/v2/biometria/evidencia/123.jpg"
    )
    test_db.add(registro)
    await test_db.commit()

    # Act
    response = await async_client.get("/api/v2/biometria/asistencias", headers=admin_token_headers)
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert data[0]["userName"] == admin_user.nombre
    assert data[0]["userCedula"] == admin_user.cedula

async def test_obtener_evidencia_subcarpeta_autorizacion(async_client: AsyncClient, admin_token_headers: dict, normal_user_token_headers: dict, normal_user: Usuario, admin_user: Usuario):
    # Act: normal user tries to access admin's evidence -> 403
    response = await async_client.get(f"/api/v2/biometria/evidencia/{admin_user.id}/test.jpg", headers=normal_user_token_headers)
    assert response.status_code == 403

    # Act: normal user tries to access their own evidence -> 404 (file doesn't physically exist, but passing auth check)
    response = await async_client.get(f"/api/v2/biometria/evidencia/{normal_user.id}/test.jpg", headers=normal_user_token_headers)
    assert response.status_code == 404

    # Act: admin tries to access normal user's evidence -> 404 (auth check passed because of admin role)
    response = await async_client.get(f"/api/v2/biometria/evidencia/{normal_user.id}/test.jpg", headers=admin_token_headers)
    assert response.status_code == 404

async def test_obtener_evidencia_legacy(async_client: AsyncClient, normal_user_token_headers: dict, normal_user: Usuario):
    # Act: access legacy path with another user's prefix -> 403
    response = await async_client.get("/api/v2/biometria/evidencia/admin_123.jpg", headers=normal_user_token_headers)
    assert response.status_code == 403

    # Act: access legacy path with own prefix -> 404 (file doesn't exist, but auth check passed)
    response = await async_client.get(f"/api/v2/biometria/evidencia/{normal_user.id}_123.jpg", headers=normal_user_token_headers)
    assert response.status_code == 404
