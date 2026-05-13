import pytest
from decimal import Decimal
from sqlalchemy import delete

from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo


TEST_DESARROLLO_ID = "TEST-PORCENTAJE-JER"


async def asegurar_recursos_tabla(db_session):
    statements = [
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS creado_por_id VARCHAR(50)",
    ]
    for statement in statements:
        await db_session.execute(db_session.execute(statement))
    await db_session.commit()


@pytest.fixture
async def desarrollo_porcentaje_seed(db_session):
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    db_session.add(
        Desarrollo(
            id=TEST_DESARROLLO_ID,
            nombre="Proyecto para prueba de porcentaje",
            estado_general="Pendiente",
        )
    )
    await db_session.commit()

    yield

    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    await db_session.commit()


@pytest.mark.asyncio
async def test_checkbox_leaf_0_a_100(client, desarrollo_porcentaje_seed):
    """Al marcar actividad sin hijos como Completado, porcentaje debe ser 100"""
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea leaf sin hijos",
            "estado": "Pendiente",
            "porcentaje_avance": 0,
            "horas_estimadas": 0,
        },
    )
    assert response.status_code == 200
    actividad_id = response.json()["id"]

    response = await client.patch(
        f"/actividades/{actividad_id}",
        json={"estado": "Completado"},
    )
    assert response.status_code == 200
    assert int(response.json()["porcentaje_avance"]) == 100


@pytest.mark.asyncio
async def test_checkbox_leaf_100_a_0(client, desarrollo_porcentaje_seed):
    """Al cambiar estado de Completado a En Progreso, porcentaje debe ser 0"""
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea para cambiar estado",
            "estado": "Completado",
            "porcentaje_avance": 100,
            "horas_estimadas": 0,
        },
    )
    assert response.status_code == 200
    actividad_id = response.json()["id"]

    response = await client.patch(
        f"/actividades/{actividad_id}",
        json={"estado": "En Progreso"},
    )
    assert response.status_code == 200
    assert int(response.json()["porcentaje_avance"]) == 0


@pytest.mark.asyncio
async def test_padre_calculado_desde_hijos(client, desarrollo_porcentaje_seed):
    """Padre calcula porcentaje como promedio de hijos: (100+0)/2 = 50"""
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Padre con 2 hijos",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert response.status_code == 200
    padre_id = response.json()["id"]

    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "parent_id": padre_id,
            "titulo": "Hijo 1 completado",
            "estado": "Completado",
            "horas_estimadas": 0,
        },
    )
    assert response.status_code == 200
    hijo1_id = response.json()["id"]

    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "parent_id": padre_id,
            "titulo": "Hijo 2 pendiente",
            "estado": "Pendiente",
            "horas_estimadas": 0,
        },
    )
    assert response.status_code == 200

    response = await client.patch(
        f"/actividades/{hijo1_id}",
        json={"estado": "Completado"},
    )
    assert response.status_code == 200

    response = await client.get(f"/actividades/{padre_id}")
    assert response.status_code == 200
    assert int(response.json()["porcentaje_avance"]) == 50


@pytest.mark.asyncio
async def test_propaga_2_niveles(client, desarrollo_porcentaje_seed):
    """Nivel 2 cambia -> nivel 1 recalcula -> nivel 0 recalcula"""
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Raiz nivel 0",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert response.status_code == 200
    nivel0_id = response.json()["id"]

    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "parent_id": nivel0_id,
            "titulo": "Hijo nivel 1",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert response.status_code == 200
    nivel1_id = response.json()["id"]

    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "parent_id": nivel1_id,
            "titulo": "Nieto nivel 2",
            "estado": "Pendiente",
            "porcentaje_avance": 0,
            "horas_estimadas": 0,
        },
    )
    assert response.status_code == 200
    nivel2_id = response.json()["id"]

    await client.patch(
        f"/actividades/{nivel2_id}",
        json={"estado": "Completado"},
    )

    response = await client.get(f"/actividades/{nivel1_id}")
    assert int(response.json()["porcentaje_avance"]) == 100

    response = await client.get(f"/actividades/{nivel0_id}")
    assert int(response.json()["porcentaje_avance"]) == 100


@pytest.mark.asyncio
async def test_sin_hijos_respeta_estado_no_completada(client, desarrollo_porcentaje_seed):
    """Sin marcar como Completado, porcentaje debe ser 0"""
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea Pendiente",
            "estado": "Pendiente",
            "porcentaje_avance": 0,
            "horas_estimadas": 0,
        },
    )
    assert response.status_code == 200
    actividad_id = response.json()["id"]

    response = await client.get(f"/actividades/{actividad_id}")
    assert response.status_code == 200
    assert int(response.json()["porcentaje_avance"]) == 0


@pytest.mark.asyncio
async def test_raiz_calculada_desde_subtareas(client, desarrollo_porcentaje_seed):
    """3 subtareas: (100+0+100)/3 = 67%"""
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Proyecto raiz",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert response.status_code == 200
    raiz_id = response.json()["id"]

    for i, estado in enumerate(["Completado", "Pendiente", "Completado"]):
        response = await client.post(
            "/actividades/",
            json={
                "desarrollo_id": TEST_DESARROLLO_ID,
                "parent_id": raiz_id,
                "titulo": f"Subtarea {i+1}",
                "estado": estado,
                "porcentaje_avance": 100 if estado == "Completado" else 0,
                "horas_estimadas": 0,
            },
        )
        assert response.status_code == 200

    response = await client.get(f"/actividades/{raiz_id}")
    assert int(response.json()["porcentaje_avance"]) == 67
