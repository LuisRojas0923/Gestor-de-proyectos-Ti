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
