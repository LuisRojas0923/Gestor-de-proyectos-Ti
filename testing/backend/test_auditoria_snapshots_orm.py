"""Tests de snapshots de auditoría sobre instancias ORM (SQLModel + SQLAlchemy)."""
import pytest
from decimal import Decimal
from sqlalchemy import delete

from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo
from app.services.auditoria.snapshots import modelo_a_dict_auditoria

TEST_DESARROLLO_ID = "TEST-SNAPSHOT-ORM"


@pytest.mark.asyncio
async def test_modelo_a_dict_auditoria_desarrollo_orm_sin_relaciones(db_session):
    await db_session.execute(
        delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID)
    )
    await db_session.execute(
        delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID)
    )
    await db_session.commit()

    desarrollo = Desarrollo(
        id=TEST_DESARROLLO_ID,
        nombre="Proyecto snapshot ORM",
        estado_general="Pendiente",
        estado_validacion="aprobada",
        area_desarrollo="TODAS",
        porcentaje_progreso=Decimal("25"),
    )
    db_session.add(desarrollo)
    await db_session.commit()
    await db_session.refresh(desarrollo)

    datos = modelo_a_dict_auditoria(desarrollo)

    assert datos["id"] == TEST_DESARROLLO_ID
    assert datos["nombre"] == "Proyecto snapshot ORM"
    assert float(datos["porcentaje_progreso"]) == 25.0
    assert "actividades" not in datos
    assert "fase_actual" not in datos

    await db_session.execute(
        delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID)
    )
    await db_session.execute(
        delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID)
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_put_desarrollo_solo_porcentaje_progreso(client, auth_token, db_session):
    if not auth_token:
        pytest.skip("Sin token de autenticación para prueba de integración")

    headers = {"Authorization": f"Bearer {auth_token}"}

    await db_session.execute(
        delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID)
    )
    await db_session.execute(
        delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID)
    )
    await db_session.commit()

    desarrollo = Desarrollo(
        id=TEST_DESARROLLO_ID,
        nombre="PUT porcentaje progreso",
        estado_general="Pendiente",
        estado_validacion="aprobada",
        area_desarrollo="TODAS",
        porcentaje_progreso=Decimal("0"),
    )
    db_session.add(desarrollo)
    actividad = Actividad(
        desarrollo_id=TEST_DESARROLLO_ID,
        titulo="Tarea de prueba",
        estado="Pendiente",
        porcentaje_avance=Decimal("0"),
        horas_estimadas=Decimal("0"),
    )
    db_session.add(actividad)
    await db_session.commit()

    response = await client.put(
        f"/desarrollos/{TEST_DESARROLLO_ID}",
        json={"porcentaje_progreso": 50},
        headers=headers,
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["id"] == TEST_DESARROLLO_ID
    assert int(float(data["porcentaje_progreso"])) == 50

    await db_session.execute(
        delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID)
    )
    await db_session.execute(
        delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID)
    )
    await db_session.commit()
