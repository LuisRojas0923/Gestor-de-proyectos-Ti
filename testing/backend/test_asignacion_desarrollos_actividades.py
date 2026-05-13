import pytest
from sqlalchemy import delete, text

from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo


TEST_DESARROLLO_ID = "TEST-JER-ASIGNACION"


async def asegurar_columnas_asignacion(db_session):
    statements = [
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS creado_por_id VARCHAR(50)",
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS responsable_id VARCHAR(50)",
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(50) DEFAULT 'aprobada'",
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS validado_por_id VARCHAR(50)",
        "ALTER TABLE desarrollos ADD COLUMN IF NOT EXISTS validado_en TIMESTAMPTZ",
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS asignado_a_id VARCHAR(50)",
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS delegado_por_id VARCHAR(50)",
        "ALTER TABLE actividades ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(50) DEFAULT 'aprobada'",
    ]
    for statement in statements:
        await db_session.execute(text(statement))
    await db_session.commit()


@pytest.fixture
async def desarrollo_asignacion_seed(db_session):
    await asegurar_columnas_asignacion(db_session)
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    db_session.add(
        Desarrollo(
            id=TEST_DESARROLLO_ID,
            nombre="Proyecto jerarquico de prueba",
            estado_general="Pendiente",
        )
    )
    await db_session.commit()

    yield

    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    await db_session.commit()


@pytest.mark.asyncio
async def test_actualizar_desarrollo_guarda_responsable_y_validacion(client, desarrollo_asignacion_seed):
    response = await client.put(
        f"/desarrollos/{TEST_DESARROLLO_ID}",
        json={
            "creado_por_id": "USR-JER-GERENTE",
            "responsable_id": "USR-JER-DIRECTOR",
            "estado_validacion": "pendiente",
            "validado_por_id": "USR-JER-DIRECTOR",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["creado_por_id"] == "USR-JER-GERENTE"
    assert data["responsable_id"] == "USR-JER-DIRECTOR"
    assert data["estado_validacion"] == "pendiente"
    assert data["validado_por_id"] == "USR-JER-DIRECTOR"


@pytest.mark.asyncio
async def test_crear_actividad_guarda_asignado_y_validacion(client, desarrollo_asignacion_seed):
    response = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea con ejecutor jerarquico",
            "responsable_id": "USR-JER-DIRECTOR",
            "asignado_a_id": "USR-JER-JEFE",
            "delegado_por_id": "USR-JER-GERENTE",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["responsable_id"] == "USR-JER-DIRECTOR"
    assert data["asignado_a_id"] == "USR-JER-JEFE"
    assert data["delegado_por_id"] == "USR-JER-GERENTE"
    assert data["estado_validacion"] == "aprobada"


@pytest.mark.asyncio
async def test_arbol_actividades_no_dispara_lazy_loading(client, desarrollo_asignacion_seed):
    raiz = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea raiz para arbol",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert raiz.status_code == 200

    hija = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "parent_id": raiz.json()["id"],
            "titulo": "Subtarea para arbol",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert hija.status_code == 200

    response = await client.get(f"/actividades/desarrollo/{TEST_DESARROLLO_ID}/arbol")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["titulo"] == "Tarea raiz para arbol"
    assert data[0]["subactividades"][0]["titulo"] == "Subtarea para arbol"


@pytest.mark.asyncio
async def test_actualizar_actividad_guarda_reasignacion(client, desarrollo_asignacion_seed):
    creada = await client.post(
        "/actividades/",
        json={
            "desarrollo_id": TEST_DESARROLLO_ID,
            "titulo": "Tarea para reasignar",
            "horas_estimadas": 0,
            "porcentaje_avance": 0,
        },
    )
    assert creada.status_code == 200

    actividad_id = creada.json()["id"]
    response = await client.patch(
        f"/actividades/{actividad_id}",
        json={
            "asignado_a_id": "USR-JER-EJECUTOR",
            "delegado_por_id": "USR-JER-JEFE",
            "estado_validacion": "aprobada",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["asignado_a_id"] == "USR-JER-EJECUTOR"
    assert data["delegado_por_id"] == "USR-JER-JEFE"
    assert data["estado_validacion"] == "aprobada"
