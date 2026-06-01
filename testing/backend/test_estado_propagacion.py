"""
Tests de propagación de estado: sub-tarea En Progreso → padre pasa a En Progreso.
Patrón: HTTP client + seed fixture (igual que test_porcentaje_jerarquico.py).
"""
import pytest
import pytest_asyncio
from sqlalchemy import delete

from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo

TEST_DESARROLLO_ID = "TEST-ESTADO-PROP"


@pytest_asyncio.fixture
async def seed(db_session):
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    db_session.add(
        Desarrollo(
            id=TEST_DESARROLLO_ID,
            nombre="Proyecto para prueba de propagación de estado",
            estado_general="Pendiente",
        )
    )
    await db_session.commit()
    yield
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    await db_session.commit()


async def _crear(client, titulo, parent_id=None, estado="Pendiente"):
    r = await client.post("/actividades/", json={
        "desarrollo_id": TEST_DESARROLLO_ID,
        "titulo": titulo,
        "estado": estado,
        "porcentaje_avance": 0,
        "horas_estimadas": 0,
        **({"parent_id": parent_id} if parent_id else {}),
    })
    assert r.status_code == 200
    return r.json()["id"]


async def _estado(client, actividad_id) -> str:
    r = await client.get(f"/actividades/{actividad_id}")
    assert r.status_code == 200
    return r.json()["estado"]


async def _patch_estado(client, actividad_id, estado):
    r = await client.patch(f"/actividades/{actividad_id}", json={"estado": estado})
    assert r.status_code == 200
    return r.json()


# ─── Caso 1: árbol 3 niveles, todos Pendiente ───────────────────────────────

@pytest.mark.asyncio
async def test_propaga_3_niveles_todos_pendiente(client, seed):
    """Marcar nieto En Progreso → padre y abuelo deben pasar a En Progreso."""
    abuelo_id = await _crear(client, "Abuelo")
    padre_id  = await _crear(client, "Padre",  parent_id=abuelo_id)
    nieto_id  = await _crear(client, "Nieto",  parent_id=padre_id)

    await client.patch(f"/actividades/{nieto_id}", json={"estado": "En Progreso"})

    assert await _estado(client, padre_id)  == "En Progreso"
    assert await _estado(client, abuelo_id) == "En Progreso"


# ─── Caso 2: padre en "Completada" → no sobrescribir, ascenso se detiene ────

@pytest.mark.asyncio
async def test_no_sobrescribe_padre_completada(client, seed):
    """Padre Completada → PATCH nieto a En Progreso → padre sin cambio, abuelo sin cambio."""
    abuelo_id = await _crear(client, "Abuelo")
    padre_id  = await _crear(client, "Padre",  parent_id=abuelo_id, estado="Completada")
    nieto_id  = await _crear(client, "Nieto",  parent_id=padre_id)

    await client.patch(f"/actividades/{nieto_id}", json={"estado": "En Progreso"})

    assert await _estado(client, padre_id)  == "Completada"
    assert await _estado(client, abuelo_id) == "Pendiente"   # break detuvo el ascenso


# ─── Caso 3: padre en "Completado" (doble grafía) ───────────────────────────

@pytest.mark.asyncio
async def test_no_sobrescribe_padre_completado(client, seed):
    """Padre Completado (masculino) → PATCH hijo a En Progreso → padre sin cambio."""
    padre_id = await _crear(client, "Padre", estado="Completado")
    hijo_id  = await _crear(client, "Hijo",  parent_id=padre_id)

    await client.patch(f"/actividades/{hijo_id}", json={"estado": "En Progreso"})

    assert await _estado(client, padre_id) == "Completado"


# ─── Caso 4: padre en "Pausa" → no sobrescribir ─────────────────────────────

@pytest.mark.asyncio
async def test_no_sobrescribe_padre_pausa(client, seed):
    padre_id = await _crear(client, "Padre en Pausa", estado="Pausa")
    hijo_id  = await _crear(client, "Hijo",           parent_id=padre_id)

    await client.patch(f"/actividades/{hijo_id}", json={"estado": "En Progreso"})

    assert await _estado(client, padre_id) == "Pausa"


# ─── Caso 5: padre en "Bloqueado" → no sobrescribir ─────────────────────────

@pytest.mark.asyncio
async def test_no_sobrescribe_padre_bloqueado(client, seed):
    padre_id = await _crear(client, "Padre Bloqueado", estado="Bloqueado")
    hijo_id  = await _crear(client, "Hijo",             parent_id=padre_id)

    await client.patch(f"/actividades/{hijo_id}", json={"estado": "En Progreso"})

    assert await _estado(client, padre_id) == "Bloqueado"


# ─── Caso 6: leaf sin padre → 200 OK, sin error ──────────────────────────────

@pytest.mark.asyncio
async def test_leaf_sin_padre_no_falla(client, seed):
    leaf_id = await _crear(client, "Leaf sin padre")

    r = await client.patch(f"/actividades/{leaf_id}", json={"estado": "En Progreso"})

    assert r.status_code == 200
    assert r.json()["estado"] == "En Progreso"


# ─── Caso 7: mixto — padre Pendiente, abuelo Bloqueado ───────────────────────

@pytest.mark.asyncio
async def test_break_en_abuelo_bloqueado(client, seed):
    """Padre Pendiente → abuelo Bloqueado: padre cambia, abuelo NO."""
    abuelo_id = await _crear(client, "Abuelo Bloqueado", estado="Bloqueado")
    padre_id  = await _crear(client, "Padre Pendiente",  parent_id=abuelo_id)
    nieto_id  = await _crear(client, "Nieto",             parent_id=padre_id)

    await client.patch(f"/actividades/{nieto_id}", json={"estado": "En Progreso"})

    assert await _estado(client, padre_id)  == "En Progreso"
    assert await _estado(client, abuelo_id) == "Bloqueado"


# ─── Caso 8: regresión de porcentajes ────────────────────────────────────────

@pytest.mark.asyncio
async def test_porcentaje_no_regresiona(client, seed):
    """Propagar estado no debe alterar el cálculo de porcentaje del padre."""
    padre_id = await _crear(client, "Padre regresión")
    hijo1_id = await _crear(client, "Hijo 1 completado", parent_id=padre_id, estado="Completado")
    hijo2_id = await _crear(client, "Hijo 2 pendiente",  parent_id=padre_id)

    # Completar hijo1 para que padre quede al 50%
    await client.patch(f"/actividades/{hijo1_id}", json={"estado": "Completado"})

    # Marcar hijo2 En Progreso → propaga estado al padre, porcentaje debe seguir siendo 50
    await client.patch(f"/actividades/{hijo2_id}", json={"estado": "En Progreso"})

    r = await client.get(f"/actividades/{padre_id}")
    assert r.status_code == 200
    assert int(r.json()["porcentaje_avance"]) == 50
