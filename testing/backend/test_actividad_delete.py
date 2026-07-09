"""
Tests para anulación lógica de Actividades.
"""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, text, select

from app.models.desarrollo.actividad import Actividad, ActividadActualizar, ActividadCrear
from app.models.desarrollo.desarrollo import Desarrollo
from app.models.auth.usuario import Usuario


TEST_DESARROLLO_ID = "TEST-DEL-CASCADE"


async def setup_desarrollo(db_session):
    from app.models.desarrollo.desarrollo import ValidacionAsignacion
    await db_session.execute(delete(ValidacionAsignacion).where(ValidacionAsignacion.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Actividad).where(Actividad.desarrollo_id == TEST_DESARROLLO_ID))
    await db_session.execute(delete(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    db_session.add(Desarrollo(id=TEST_DESARROLLO_ID, nombre="Proyecto Test Delete", creado_por_id="USR-REAL"))
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
    """Eliminar una actividad sin hijos la conserva como anulada."""
    await setup_desarrollo(db_session)
    tarea = await crear_actividad(db_session, "Tarea aislada")

    from app.services.desarrollos.actividad_delete_service import eliminar_actividad_cascade
    count = await eliminar_actividad_cascade(db_session, tarea.id, "USR-ANULA")
    await db_session.commit()

    assert count == 1
    stmt = select(Actividad).where(Actividad.id == tarea.id)
    result = await db_session.execute(stmt)
    anulada = result.scalar_one_or_none()
    assert anulada is not None
    assert anulada.anulada is True
    assert anulada.estado == "Anulada"
    assert anulada.anulada_en is not None
    assert anulada.anulada_por_id == "USR-ANULA"
    assert anulada.porcentaje_avance == 0


@pytest.mark.asyncio
async def test_eliminar_con_hijos_cascade(db_session):
    """Eliminar una actividad anula hijos y subhijos recursivamente."""
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
        anulada = result.scalar_one_or_none()
        assert anulada is not None
        assert anulada.anulada is True


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
    raiz_activa = result.scalar_one_or_none()
    assert raiz_activa is not None
    assert raiz_activa.anulada is False

    stmt_hermano = select(Actividad).where(Actividad.id == hijo2.id)
    result = await db_session.execute(stmt_hermano)
    assert result.scalar_one_or_none() is not None

    stmt_nieto = select(Actividad).where(Actividad.id == nieto.id)
    result = await db_session.execute(stmt_nieto)
    nieto_anulado = result.scalar_one_or_none()
    assert nieto_anulado is not None
    assert nieto_anulado.anulada is True


@pytest.mark.asyncio
async def test_eliminar_actividad_con_validacion_asignacion(db_session):
    """Eliminar una actividad que tiene una validación de asignación asociada."""
    await setup_desarrollo(db_session)
    tarea = await crear_actividad(db_session, "Tarea con validacion")

    from app.models.desarrollo.desarrollo import ValidacionAsignacion
    val = ValidacionAsignacion(
        desarrollo_id=TEST_DESARROLLO_ID,
        actividad_id=tarea.id,
        solicitado_por_id="USR-1",
        validador_id="USR-2",
        asignado_a_id="USR-3",
        estado="pendiente",
        motivo="Test motivo"
    )
    db_session.add(val)
    await db_session.commit()

    from app.services.desarrollos.actividad_delete_service import eliminar_actividad_cascade
    # Esto debería eliminar la validación y luego la actividad sin tirar error de FK
    count = await eliminar_actividad_cascade(db_session, tarea.id)
    await db_session.commit()

    assert count == 1
    
    # Verificar que la actividad fue anulada, no eliminada
    stmt = select(Actividad).where(Actividad.id == tarea.id)
    result = await db_session.execute(stmt)
    anulada = result.scalar_one_or_none()
    assert anulada is not None
    assert anulada.anulada is True

    # Verificar que la validación asociada también fue eliminada
    stmt_val = select(ValidacionAsignacion).where(ValidacionAsignacion.actividad_id == tarea.id)
    result_val = await db_session.execute(stmt_val)
    assert result_val.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_eliminar_actividad_anulada_es_idempotente(db_session):
    """Anular por segunda vez no sobrescribe auditoría ni vuelve a contar."""
    await setup_desarrollo(db_session)
    tarea = await crear_actividad(db_session, "Tarea idempotente")

    from app.services.desarrollos.actividad_delete_service import eliminar_actividad_cascade
    primer_count = await eliminar_actividad_cascade(db_session, tarea.id, "USR-UNO")
    await db_session.commit()

    stmt = select(Actividad).where(Actividad.id == tarea.id)
    result = await db_session.execute(stmt)
    primera_anulacion = result.scalar_one()
    anulada_en_original = primera_anulacion.anulada_en

    segundo_count = await eliminar_actividad_cascade(db_session, tarea.id, "USR-DOS")
    await db_session.commit()

    result = await db_session.execute(stmt)
    segunda_anulacion = result.scalar_one()
    assert primer_count == 1
    assert segundo_count == 0
    assert segunda_anulacion.anulada_por_id == "USR-UNO"
    assert segunda_anulacion.anulada_en == anulada_en_original


@pytest.mark.asyncio
async def test_crear_actividad_fuerza_delegador_autenticado(db_session):
    """El delegador lo define el servidor, no el payload del cliente."""
    await setup_desarrollo(db_session)

    from app.api.desarrollos.actividades_router import crear_actividad as crear_actividad_router
    request = SimpleNamespace(state=SimpleNamespace())
    usuario = Usuario(id="USR-REAL", cedula="USR-REAL", hash_contrasena="x", nombre="Usuario Real")
    creada = await crear_actividad_router(
        request,
        ActividadCrear(
            desarrollo_id=TEST_DESARROLLO_ID,
            titulo="Tarea con delegador forzado",
            delegado_por_id="USR-FALSO",
        ),
        db_session,
        usuario,
    )

    assert creada.delegado_por_id == "USR-REAL"


@pytest.mark.asyncio
async def test_crear_subactividad_bajo_padre_anulado_falla(db_session):
    """No se permite crear nodos activos debajo de una rama anulada."""
    await setup_desarrollo(db_session)
    padre = await crear_actividad(db_session, "Padre anulado")

    from app.services.desarrollos.actividad_delete_service import eliminar_actividad_cascade
    from app.api.desarrollos.actividades_router import crear_actividad as crear_actividad_router
    await eliminar_actividad_cascade(db_session, padre.id, "USR-REAL")
    await db_session.commit()

    request = SimpleNamespace(state=SimpleNamespace())
    usuario = Usuario(id="USR-REAL", cedula="USR-REAL", hash_contrasena="x", nombre="Usuario Real")
    with pytest.raises(HTTPException) as exc:
        await crear_actividad_router(
            request,
            ActividadCrear(
                desarrollo_id=TEST_DESARROLLO_ID,
                parent_id=padre.id,
                titulo="Subactividad inválida",
            ),
            db_session,
            usuario,
        )

    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_crear_tarea_wbs_en_desarrollo_anulado_falla(db_session):
    """No se permite crear WBS raíz cuando el desarrollo está anulado."""
    await setup_desarrollo(db_session)
    result = await db_session.execute(select(Desarrollo).where(Desarrollo.id == TEST_DESARROLLO_ID))
    desarrollo = result.scalar_one()
    desarrollo.estado_general = "Anulado"
    await db_session.commit()

    from app.api.desarrollos.actividades_router import crear_actividad as crear_actividad_router
    request = SimpleNamespace(state=SimpleNamespace())
    usuario = Usuario(id="USR-REAL", cedula="USR-REAL", hash_contrasena="x", nombre="Usuario Real")
    with pytest.raises(HTTPException) as exc:
        await crear_actividad_router(
            request,
            ActividadCrear(desarrollo_id=TEST_DESARROLLO_ID, titulo="WBS no permitida"),
            db_session,
            usuario,
        )

    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_obtener_actividad_sin_permiso_falla(db_session):
    """GET por ID exige autorización, no solo autenticación."""
    await setup_desarrollo(db_session)
    tarea = await crear_actividad(db_session, "Tarea privada")

    from app.api.desarrollos.actividades_router import obtener_actividad
    usuario = Usuario(id="USR-AJENO", cedula="USR-AJENO", hash_contrasena="x", nombre="Usuario Ajeno")
    with pytest.raises(HTTPException) as exc:
        await obtener_actividad(tarea.id, db_session, usuario)

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_preview_anulacion_solo_delegador_original(db_session):
    """La vista previa de anulación no expone descendientes a no delegadores."""
    await setup_desarrollo(db_session)
    tarea = await crear_actividad(db_session, "Tarea con preview")
    tarea.delegado_por_id = "USR-DELEGADOR"
    await db_session.commit()

    from app.api.desarrollos.actividades_router import eliminar_actividad_preview
    usuario = Usuario(id="USR-AJENO", cedula="USR-AJENO", hash_contrasena="x", nombre="Usuario Ajeno")
    with pytest.raises(HTTPException) as exc:
        await eliminar_actividad_preview(tarea.id, db_session, usuario)

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_patch_actividad_anulada_falla_409(db_session):
    """PATCH no permite modificar actividades anuladas."""
    await setup_desarrollo(db_session)
    tarea = await crear_actividad(db_session, "Tarea anulada para patch")

    from app.services.desarrollos.actividad_delete_service import eliminar_actividad_cascade
    from app.api.desarrollos.actividades_router import actualizar_actividad
    await eliminar_actividad_cascade(db_session, tarea.id, "USR-REAL")
    await db_session.commit()

    request = SimpleNamespace(state=SimpleNamespace())
    usuario = Usuario(id="USR-REAL", cedula="USR-REAL", hash_contrasena="x", nombre="Usuario Real")
    with pytest.raises(HTTPException) as exc:
        await actualizar_actividad(
            request,
            tarea.id,
            ActividadActualizar(titulo="No debe cambiar"),
            db_session,
            usuario,
        )

    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_delete_router_solo_delegador_original(db_session):
    """DELETE anula para el delegador original y rechaza usuarios ajenos."""
    await setup_desarrollo(db_session)
    tarea = await crear_actividad(db_session, "Tarea para delete router")
    tarea.delegado_por_id = "USR-DELEGADOR"
    await db_session.commit()

    from app.api.desarrollos.actividades_router import eliminar_actividad
    request = SimpleNamespace(state=SimpleNamespace())
    usuario_ajeno = Usuario(id="USR-AJENO", cedula="USR-AJENO", hash_contrasena="x", nombre="Usuario Ajeno")
    with pytest.raises(HTTPException) as exc:
        await eliminar_actividad(request, tarea.id, db_session, usuario_ajeno)
    assert exc.value.status_code == 403

    usuario_delegador = Usuario(id="USR-DELEGADOR", cedula="USR-DELEGADOR", hash_contrasena="x", nombre="Usuario Delegador")
    respuesta = await eliminar_actividad(request, tarea.id, db_session, usuario_delegador)

    result = await db_session.execute(select(Actividad).where(Actividad.id == tarea.id))
    anulada = result.scalar_one()
    assert respuesta.eliminadas == 1
    assert anulada.anulada is True


def test_schemas_entrada_no_exponen_campos_anulacion():
    """POST/PATCH no deben permitir manipular campos internos de anulación."""
    crear = ActividadCrear(
        desarrollo_id=TEST_DESARROLLO_ID,
        titulo="Intento",
        anulada=True,
        anulada_por_id="USR-FALSO",
    )
    actualizar = ActividadActualizar(
        anulada=False,
        anulada_en="2026-01-01T00:00:00",
        anulada_por_id="USR-FALSO",
        delegado_por_id="USR-FALSO",
        parent_id=123,
    )

    assert "anulada" not in crear.model_dump()
    assert "anulada_por_id" not in crear.model_dump()
    assert "anulada" not in actualizar.model_dump(exclude_unset=True)
    assert "anulada_en" not in actualizar.model_dump(exclude_unset=True)
    assert "anulada_por_id" not in actualizar.model_dump(exclude_unset=True)
    assert "delegado_por_id" not in actualizar.model_dump(exclude_unset=True)
    assert "parent_id" not in actualizar.model_dump(exclude_unset=True)
