"""Integración PostgreSQL del servicio de plantillas y su autorización."""
from contextlib import asynccontextmanager
from datetime import time
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth.usuario import Usuario
from app.models.novedades_nomina.horas_extras import NominaHorarioPactado
from app.models.novedades_nomina.plantillas_horario import (
    NominaAplicacionPlantillaEmpleado,
    NominaAplicacionPlantillaHorario,
    NominaPlantillaHorarioHistorial,
    OperacionIdempotente,
)
from app.models.novedades_nomina.schemas_plantillas_horario import (
    PlantillaHorarioCreate,
    PlantillaHorarioDiaIn,
    PlantillaHorarioUpdate,
)
from app.services.novedades_nomina.plantillas_horario_service import (
    TIPO_APLICACION,
    aplicar_plantilla,
    crear_plantilla,
    desactivar_plantilla,
    editar_plantilla,
    listar_plantillas,
)


def _dias() -> list[PlantillaHorarioDiaIn]:
    return [
        PlantillaHorarioDiaIn(
            dia_semana=dia,
            hora_entrada=time(22, 0) if dia == 3 else (time(8, 0) if dia <= 5 else None),
            hora_salida=time(6, 0) if dia == 3 else (time(17, 0) if dia <= 5 else None),
            minutos_almuerzo=30 if dia <= 5 else 0,
            cruza_medianoche=dia == 3,
        )
        for dia in range(1, 8)
    ]


@asynccontextmanager
async def _sesion_reversible(db_session):
    async with db_session.bind.connect() as conexion:
        transaccion = await conexion.begin()
        session = AsyncSession(
            bind=conexion,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        try:
            yield session
        finally:
            await session.close()
            await transaccion.rollback()


async def _actor(session: AsyncSession):
    sufijo = uuid4().hex[:12]
    usuario = Usuario(
        id=f"TEST-PL-{sufijo}",
        cedula=str(uuid4().int)[:30],
        hash_contrasena="hash-test",
        nombre="Actor plantillas test",
        rol="admin",
    )
    session.add(usuario)
    await session.commit()
    return usuario


@pytest.mark.asyncio
async def test_crud_busqueda_version_e_historial_en_postgresql(db_session):
    async with _sesion_reversible(db_session) as session:
        actor = await _actor(session)
        nombre = f"Turno QA {uuid4().hex[:8]}"
        creada = await crear_plantilla(
            session,
            PlantillaHorarioCreate(nombre=nombre, descripcion="Filtro nocturno", dias=_dias()),
            actor,
        )

        editada = await editar_plantilla(
            session,
            creada.id,
            PlantillaHorarioUpdate(version_esperada=1, descripcion="Descripción editada"),
            actor,
        )
        items, total = await listar_plantillas(
            session, 20, 0, incluir_inactivas=True, q="Descripción editada"
        )
        desactivada = await desactivar_plantilla(session, creada.id, actor)
        acciones = (await session.execute(
            select(NominaPlantillaHorarioHistorial.accion)
            .where(NominaPlantillaHorarioHistorial.plantilla_id == creada.id)
            .order_by(NominaPlantillaHorarioHistorial.creado_en)
        )).scalars().all()

        assert editada.version == 2
        assert total == 1 and items[0].id == creada.id and len(items[0].dias) == 7
        assert desactivada.esta_activa is False and desactivada.version == 3
        assert acciones == ["CREADA", "EDITADA", "DESACTIVADA"]


@pytest.mark.asyncio
async def test_aplicacion_snapshot_replay_y_conflicto_idempotente(db_session):
    async with _sesion_reversible(db_session) as session:
        actor = await _actor(session)
        plantilla = await crear_plantilla(
            session,
            PlantillaHorarioCreate(nombre=f"Aplicación {uuid4().hex}", dias=_dias()),
            actor,
        )
        plantilla_id = plantilla.id
        actor_ref = SimpleNamespace(id=actor.id, rol="admin")
        solicitud_id = uuid4()
        cedula = str(uuid4().int)[:30]
        resultado = await aplicar_plantilla(
            session, plantilla_id, solicitud_id, [cedula], actor_ref
        )
        replay = await aplicar_plantilla(
            session, plantilla_id, solicitud_id, [cedula], actor_ref
        )
        detalle = await session.get(
            NominaAplicacionPlantillaEmpleado, (resultado.aplicacion_id, cedula)
        )
        total_aplicaciones = int(await session.scalar(
            select(func.count()).select_from(NominaAplicacionPlantillaHorario).where(
                NominaAplicacionPlantillaHorario.solicitud_id == solicitud_id
            )
        ) or 0)
        snapshot_anterior = detalle.snapshot_anterior
        snapshot_aplicado = detalle.snapshot_aplicado

        await editar_plantilla(
            session,
            plantilla_id,
            PlantillaHorarioUpdate(version_esperada=1, descripcion="Editada después"),
            actor,
        )
        detalle_posterior = await session.get(
            NominaAplicacionPlantillaEmpleado, (resultado.aplicacion_id, cedula)
        )
        assert detalle_posterior.snapshot_aplicado == snapshot_aplicado

        with pytest.raises(RuntimeError, match="idempotencia"):
            await aplicar_plantilla(
                session, plantilla_id, solicitud_id, [str(uuid4().int)[:30]], actor_ref
            )
        with pytest.raises(RuntimeError, match="idempotencia"):
            await aplicar_plantilla(
                session,
                plantilla_id,
                solicitud_id,
                [cedula],
                SimpleNamespace(id="ACTOR-DIFERENTE", rol="admin"),
            )
        total_despues_conflicto = int(await session.scalar(
            select(func.count()).select_from(NominaAplicacionPlantillaHorario).where(
                NominaAplicacionPlantillaHorario.solicitud_id == solicitud_id
            )
        ) or 0)

        assert len(snapshot_anterior) == 7
        assert len(snapshot_aplicado) == 7
        assert snapshot_aplicado[2]["cruza_medianoche"] is True
        assert replay.idempotente is True
        assert total_aplicaciones == 1
        assert total_despues_conflicto == 1


@pytest.mark.asyncio
async def test_aplicacion_revierte_todo_si_falla_segundo_empleado(db_session):
    async with _sesion_reversible(db_session) as session:
        actor = await _actor(session)
        plantilla = await crear_plantilla(
            session,
            PlantillaHorarioCreate(nombre=f"Atómica {uuid4().hex}", dias=_dias()),
            actor,
        )
        solicitud_id = uuid4()
        cedula_uno = str(uuid4().int)[:30]
        cedula_dos = str(uuid4().int)[:30]
        funcion = f"fallar_horario_{uuid4().hex}"
        trigger = f"trg_{funcion}"
        await session.execute(text(f"""
            CREATE FUNCTION {funcion}() RETURNS trigger AS $$
            BEGIN
                IF NEW.cedula = '{cedula_dos}' THEN
                    RAISE EXCEPTION 'fallo controlado';
                END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql
        """))
        await session.execute(text(f"""
            CREATE TRIGGER {trigger} BEFORE INSERT OR UPDATE
            ON nomina_horario_pactado_dia
            FOR EACH ROW EXECUTE FUNCTION {funcion}()
        """))
        await session.commit()

        with pytest.raises(Exception, match="fallo controlado"):
            await aplicar_plantilla(
                session, plantilla.id, solicitud_id, [cedula_uno, cedula_dos], actor
            )

        horarios = int(await session.scalar(
            select(func.count()).select_from(NominaHorarioPactado).where(
                NominaHorarioPactado.cedula.in_([cedula_uno, cedula_dos])
            )
        ) or 0)
        ledger = await session.get(OperacionIdempotente, (solicitud_id, TIPO_APLICACION))
        assert horarios == 0
        assert ledger is None


@pytest.mark.asyncio
async def test_aplicacion_fuera_de_alcance_no_crea_ledger(db_session):
    async with _sesion_reversible(db_session) as session:
        actor_admin = await _actor(session)
        plantilla = await crear_plantilla(
            session,
            PlantillaHorarioCreate(nombre=f"IDOR {uuid4().hex}", dias=_dias()),
            actor_admin,
        )
        solicitud_id = uuid4()
        actor_gestor = SimpleNamespace(id=actor_admin.id, rol="gestor")

        with pytest.raises(PermissionError, match="disponibles"):
            await aplicar_plantilla(
                session, plantilla.id, solicitud_id, [str(uuid4().int)[:30]], actor_gestor
            )

        assert await session.get(
            OperacionIdempotente, (solicitud_id, TIPO_APLICACION)
        ) is None
