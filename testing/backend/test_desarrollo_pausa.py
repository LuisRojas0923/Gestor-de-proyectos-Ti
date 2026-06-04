import pytest
import pytest_asyncio
from sqlalchemy import delete, select
from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo

TEST_DESARROLLO_ID = "TEST-DEV-PAUSE"

@pytest_asyncio.fixture
async def seed_pause_test(db_session):
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    
    # Crear Desarrollo
    db_session.add(
        Desarrollo(
            id=TEST_DESARROLLO_ID,
            nombre="Desarrollo para prueba de pausa",
            estado_general="En curso",
            area_desarrollo="Sistemas"
        )
    )
    await db_session.commit()
    yield
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    await db_session.commit()

async def _crear_actividad(client, titulo, estado="Pendiente"):
    r = await client.post("/actividades/", json={
        "desarrollo_id": TEST_DESARROLLO_ID,
        "titulo": titulo,
        "estado": estado,
        "porcentaje_avance": 0,
        "horas_estimadas": 0,
    })
    assert r.status_code == 200
    return r.json()["id"]

async def _obtener_estado_actividad(client, actividad_id) -> str:
    r = await client.get(f"/actividades/{actividad_id}")
    assert r.status_code == 200
    return r.json()["estado"]

@pytest.mark.asyncio
async def test_cascada_pausar_y_reanudar_desarrollo(client, seed_pause_test):
    # 1. Crear actividades con diferentes estados
    act_pendiente_id = await _crear_actividad(client, "Actividad Pendiente", estado="Pendiente")
    act_en_proceso_id = await _crear_actividad(client, "Actividad En Proceso", estado="En Proceso")
    act_completada_id = await _crear_actividad(client, "Actividad Completada", estado="Completada")

    # 2. Pausar el desarrollo (estado_general -> "Pausado")
    r_pause = await client.put(f"/desarrollos/{TEST_DESARROLLO_ID}", json={
        "estado_general": "Pausado"
    })
    assert r_pause.status_code == 200
    assert r_pause.json()["estado_general"] == "Pausado"

    # Verificar que la actividad "Pendiente" pasó a "Pausa"
    assert await _obtener_estado_actividad(client, act_pendiente_id) == "Pausa"
    # Las demás actividades no deberían verse afectadas
    assert await _obtener_estado_actividad(client, act_en_proceso_id) == "En Proceso"
    assert await _obtener_estado_actividad(client, act_completada_id) == "Completada"

    # 3. Reanudar el desarrollo (estado_general -> "En curso")
    r_resume = await client.put(f"/desarrollos/{TEST_DESARROLLO_ID}", json={
        "estado_general": "En curso"
    })
    assert r_resume.status_code == 200
    assert r_resume.json()["estado_general"] == "En curso"

    # Verificar que la actividad en "Pausa" regresó a "Pendiente"
    assert await _obtener_estado_actividad(client, act_pendiente_id) == "Pendiente"
    # Las demás no cambiaron
    assert await _obtener_estado_actividad(client, act_en_proceso_id) == "En Proceso"
    assert await _obtener_estado_actividad(client, act_completada_id) == "Completada"
