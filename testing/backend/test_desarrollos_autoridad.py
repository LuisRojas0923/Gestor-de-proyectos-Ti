import pytest
from sqlalchemy import delete, text

from app.models.desarrollo.desarrollo import Desarrollo


TEST_DESARROLLO_ID = "TEST-AUTORIDAD"
TEST_DESARROLLO_CREATE_ID = "TEST-AUTORIDAD-CREATE"


@pytest.fixture
async def autoridad_column(db_session):
    await db_session.execute(text("ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS autoridad VARCHAR(255)"))


@pytest.fixture
async def desarrollo_autoridad_seed(db_session, autoridad_column):
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    db_session.add(
        Desarrollo(
            id=TEST_DESARROLLO_ID,
            nombre="Actividad con autoridad",
            estado_general="Pendiente",
        )
    )
    await db_session.commit()

    yield

    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    await db_session.commit()


@pytest.fixture
async def limpiar_desarrollo_autoridad_creado(db_session, autoridad_column):
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_CREATE_ID))
    await db_session.commit()

    yield

    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_CREATE_ID))
    await db_session.commit()


@pytest.mark.asyncio
async def test_crear_desarrollo_guarda_autoridad(client, limpiar_desarrollo_autoridad_creado):
    response = await client.post(
        "/desarrollos/",
        json={
            "id": TEST_DESARROLLO_CREATE_ID,
            "nombre": "Actividad creada con autoridad",
            "estado_general": "Pendiente",
            "autoridad": "Gerencia TI",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["autoridad"] == "Gerencia TI"


@pytest.mark.asyncio
async def test_actualizar_desarrollo_guarda_autoridad(client, desarrollo_autoridad_seed):
    response = await client.put(
        f"/desarrollos/{TEST_DESARROLLO_ID}",
        json={"autoridad": "Gerencia Administrativa"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["autoridad"] == "Gerencia Administrativa"


@pytest.mark.asyncio
async def test_actualizar_desarrollo_permite_autoridad_vacia(client, desarrollo_autoridad_seed):
    response = await client.put(
        f"/desarrollos/{TEST_DESARROLLO_ID}",
        json={"autoridad": ""},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["autoridad"] == ""
