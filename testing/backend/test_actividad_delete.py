"""
Tests para Eliminación en Cascada de Actividades
"""
import pytest
from sqlalchemy import delete, text, select

from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo


TEST_DESARROLLO_ID = "TEST-DEL-CASCADE"


async def setup_desarrollo(db_session):
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    db_session.add(Desarrollo(id=TEST_DESARROLLO_ID, nombre="Proyecto Test Delete"))
    await db_session.commit()


async def crear_actividad(
    db_session,
    titulo: str,
    parent_id: int | None = None,
    estado: str = "Pendiente",
) -> Actividad:
    act = Actividad(
        desarrollo_id=TEST_DESARROLLO_ID,
        parent_id=parent_id,
        titulo=titulo,
        estado=estado,
        porcentaje_avance=0,
    )
    db_session.add(act)
    await db_session.commit()
    await db_session.refresh(act)
    return act


@pytest.mark.asyncio
async def test_preview_solo_hijos_muestra_lista_vacia(db_session):
    """Una actividad sin hijos devuelve lista vacía en preview."""
    await setup_desarrollo(db_session)
    raiz = await crear_actividad(db_session, "Tarea sin hijos")

    from app.services.desarrollos.actividad_delete_service import obtener_hijos_preview
    actividad, hijos = await obtener_hijos_preview(db_session, raiz.id)

    assert actividad is not None
    assert actividad.id == raiz.id
    assert len(hijos) == 0


@pytest.mark.asyncio
async def test_preview_con_hijos_muestra_todos(db_session):
    """Preview muestra actividad + todos los hijos recursivos."""
    await setup_desarrollo(db_session)
    raiz = await crear_actividad(db_session, "Proyecto")
    hijo1 = await crear_actividad(db_session, "Tarea 1", parent_id=raiz.id)
    nieto1 = await crear_actividad(db_session, "Subtarea 1.1", parent_id=hijo1.id)
    hijo2 = await crear_actividad(db_session, "Tarea 2", parent_id=raiz.id)

    from app.services.desarrollos.actividad_delete_service import obtener_hijos_preview
    actividad, hijos = await obtener_hijos_preview(db_session, raiz.id)

    assert actividad.id == raiz.id
    assert len(hijos) == 3
    titulos = [h["titulo"] for h in hijos]
    assert "Tarea 1" in titulos
    assert "Subtarea 1.1" in titulos
    assert "Tarea 2" in titulos


@pytest.mark.asyncio
async def test_preview_no_existente_devuelve_none(db_session):
    """Preview de ID inexistente retorna None."""
    from app.services.desarrollos.actividad_delete_service import obtener_hijos_preview
    actividad, hijos = await obtener_hijos_preview(db_session, 999999)
    assert actividad is None
    assert len(hijos) == 0


@pytest.mark.asyncio
async def test_eliminar_solo_raiz(db_session):
    """Eliminar una actividad sin hijos solo la borra a ella."""
    await setup_desarrollo(db_session)
    tarea = await crear_actividad(db_session, "Tarea aislada")

    from app.services.desarrollos.actividad_delete_service import eliminar_actividad_cascade
    count = await eliminar_actividad_cascade(db_session, tarea.id)
    await db_session.commit()

    assert count == 1
    stmt = select(Actividad).where(Actividad.id == tarea.id)
    result = await db_session.execute(stmt)
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_eliminar_con_hijos_cascade(db_session):
    """Eliminar una actividad elimina hijos y subhijos recursivamente."""
    await setup_desarrollo(db_session)
    raiz = await crear_actividad(db_session, "Raíz")
    hijo = await crear_actividad(db_session, "Hijo", parent_id=raiz.id)
    nieto = await crear_actividad(db_session, "Nieto", parent_id=hijo.id)
    otro = await crear_actividad(db_session, "Otro hijo", parent_id=raiz.id)

    from app.services.desarrollos.actividad_delete_service import eliminar_actividad_cascade
    count = await eliminar_actividad_cascade(db_session, raiz.id)
    await db_session.commit()

    assert count == 4
    for act_id in [raiz.id, hijo.id, nieto.id, otro.id]:
        stmt = select(Actividad).where(Actividad.id == act_id)
        result = await db_session.execute(stmt)
        assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_eliminar_hijo_no_afecta_hermanos(db_session):
    """Eliminar un hijo no elimina hermanos ni la raíz."""
    await setup_desarrollo(db_session)
    raiz = await crear_actividad(db_session, "Raíz")
    hijo1 = await crear_actividad(db_session, "Hijo 1", parent_id=raiz.id)
    hijo2 = await crear_actividad(db_session, "Hijo 2", parent_id=raiz.id)
    nieto = await crear_actividad(db_session, "Nieto", parent_id=hijo1.id)

    from app.services.desarrollos.actividad_delete_service import eliminar_actividad_cascade
    count = await eliminar_actividad_cascade(db_session, hijo1.id)
    await db_session.commit()

    assert count == 2

    stmt_raiz = select(Actividad).where(Actividad.id == raiz.id)
    result = await db_session.execute(stmt_raiz)
    assert result.scalar_one_or_none() is not None

    stmt_hermano = select(Actividad).where(Actividad.id == hijo2.id)
    result = await db_session.execute(stmt_hermano)
    assert result.scalar_one_or_none() is not None

    stmt_nieto = select(Actividad).where(Actividad.id == nieto.id)
    result = await db_session.execute(stmt_nieto)
    assert result.scalar_one_or_none() is None
