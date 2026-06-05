import pytest
import pytest_asyncio
from sqlalchemy import delete
from app.models.desarrollo.desarrollo import Desarrollo

TEST_DESARROLLO_ID = "TEST-DEV-PRIORITY"

@pytest_asyncio.fixture
async def seed_priority_test(db_session):
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    await db_session.commit()
    yield
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    await db_session.commit()

@pytest.mark.asyncio
async def test_desarrollo_prioridad_crud(client, seed_priority_test):
    # 1. Crear un desarrollo con prioridad 'Alta'
    r_create = await client.post("/desarrollos/", json={
        "id": TEST_DESARROLLO_ID,
        "nombre": "Desarrollo con prioridad",
        "area_desarrollo": "Sistemas",
        "prioridad": "Alta"
    })
    assert r_create.status_code == 200
    data_create = r_create.json()
    assert data_create["prioridad"] == "Alta"

    # 2. Obtener el desarrollo y verificar que retorna la prioridad
    r_get = await client.get(f"/desarrollos/{data_create['id']}")
    assert r_get.status_code == 200
    assert r_get.json()["prioridad"] == "Alta"

    # 3. Actualizar la prioridad a 'Baja'
    r_update = await client.put(f"/desarrollos/{data_create['id']}", json={
        "prioridad": "Baja"
    })
    assert r_update.status_code == 200
    assert r_update.json()["prioridad"] == "Baja"

    # 4. Obtener nuevamente para validar persistencia
    r_get_updated = await client.get(f"/desarrollos/{data_create['id']}")
    assert r_get_updated.status_code == 200
    assert r_get_updated.json()["prioridad"] == "Baja"
