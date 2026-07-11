"""Concurrencia PostgreSQL real para relaciones gestor-empleado."""
import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import config
from app.models.auth.relacion_gestor_empleado import RelacionGestorEmpleado
from app.models.auth.usuario import Usuario
from app.models.novedades_nomina.plantillas_horario import OperacionIdempotente
from app.models.novedades_nomina.plantillas_horario import (
    NominaAplicacionPlantillaHorario, NominaPlantillaHorario,
    NominaPlantillaHorarioDia,
)
from app.models.novedades_nomina.horas_extras import NominaHorarioPactado
from app.models.novedades_nomina.horas_extras_horario_dia import NominaHorarioPactadoDia
from app.models.novedades_nomina.schemas_plantillas_horario import PlantillaHorarioCreate
from app.services.auth.alcance_empleados_service import cambiar_relaciones
from app.services.novedades_nomina.plantillas_horario_service import (
    aplicar_plantilla, crear_plantilla,
)
from testing.backend.test_horarios_plantillas_service import _dias


@pytest.fixture
async def sesiones_reales():
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    fabrica = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        yield fabrica
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_dos_sesiones_serializan_misma_relacion_con_uuid_distintos(sesiones_reales):
    sufijo = uuid4().hex[:12]
    actor_id = f"ACT-CONC-{sufijo}"
    gestor_id = f"GES-CONC-{sufijo}"
    cedula = "9" + str(uuid4().int)[:24]
    solicitudes = [uuid4(), uuid4()]
    actor = SimpleNamespace(id=actor_id, rol="admin")

    async with sesiones_reales() as setup:
        setup.add_all([
            Usuario(
                id=actor_id, cedula="7" + str(uuid4().int)[:24],
                hash_contrasena="hash", nombre="Actor concurrente", rol="admin",
            ),
            Usuario(
                id=gestor_id, cedula="8" + str(uuid4().int)[:24],
                hash_contrasena="hash", nombre="Gestor concurrente", rol="gestor",
            ),
        ])
        await setup.commit()

    async def ejecutar(solicitud_id):
        async with sesiones_reales() as session:
            return await cambiar_relaciones(
                session, solicitud_id, gestor_id, actor, [cedula], []
            )

    try:
        resultados = await asyncio.gather(*(ejecutar(item) for item in solicitudes))
        async with sesiones_reales() as verificar:
            total = int(await verificar.scalar(
                select(func.count()).select_from(RelacionGestorEmpleado).where(
                    RelacionGestorEmpleado.gestor_usuario_id == gestor_id,
                    RelacionGestorEmpleado.empleado_cedula == cedula,
                )
            ) or 0)
            ledgers = int(await verificar.scalar(
                select(func.count()).select_from(OperacionIdempotente).where(
                    OperacionIdempotente.solicitud_id.in_(solicitudes)
                )
            ) or 0)
        assert total == 1
        assert ledgers == 2
        assert sorted((r.agregadas, r.sin_cambio) for r in resultados) == [(0, 1), (1, 0)]
    finally:
        async with sesiones_reales() as limpiar:
            await limpiar.execute(text(
                "ALTER TABLE historial_relaciones_gestor_empleado "
                "DISABLE TRIGGER trg_historial_relaciones_gestor_empleado_append_only"
            ))
            await limpiar.execute(text("""
                DELETE FROM historial_relaciones_gestor_empleado
                WHERE relacion_id IN (
                    SELECT id FROM relaciones_gestor_empleado
                    WHERE gestor_usuario_id=:gestor AND empleado_cedula=:cedula
                )
            """), {"gestor": gestor_id, "cedula": cedula})
            await limpiar.execute(delete(RelacionGestorEmpleado).where(
                RelacionGestorEmpleado.gestor_usuario_id == gestor_id,
                RelacionGestorEmpleado.empleado_cedula == cedula,
            ))
            await limpiar.execute(delete(OperacionIdempotente).where(
                OperacionIdempotente.solicitud_id.in_(solicitudes)
            ))
            await limpiar.execute(delete(Usuario).where(Usuario.id.in_([actor_id, gestor_id])))
            await limpiar.execute(text(
                "ALTER TABLE historial_relaciones_gestor_empleado "
                "ENABLE TRIGGER trg_historial_relaciones_gestor_empleado_append_only"
            ))
            await limpiar.commit()


@pytest.mark.asyncio
async def test_dos_sesiones_serializan_mismo_ledger_de_aplicacion(sesiones_reales):
    sufijo = uuid4().hex[:12]
    actor_id = f"ACT-APL-{sufijo}"
    cedula = "6" + str(uuid4().int)[:24]
    solicitud_id = uuid4()
    actor = SimpleNamespace(id=actor_id, rol="admin")
    async with sesiones_reales() as setup:
        usuario = Usuario(
            id=actor_id, cedula="5" + str(uuid4().int)[:24],
            hash_contrasena="hash", nombre="Actor aplicación", rol="admin",
        )
        setup.add(usuario)
        await setup.commit()
        plantilla = await crear_plantilla(
            setup,
            PlantillaHorarioCreate(nombre=f"Concurrente {sufijo}", dias=_dias()),
            actor,
        )
        plantilla_id = plantilla.id

    async def ejecutar():
        async with sesiones_reales() as session:
            return await aplicar_plantilla(
                session, plantilla_id, solicitud_id, [cedula], actor
            )

    try:
        resultados = await asyncio.gather(ejecutar(), ejecutar())
        async with sesiones_reales() as verificar:
            total = int(await verificar.scalar(
                select(func.count()).select_from(NominaAplicacionPlantillaHorario)
                .where(NominaAplicacionPlantillaHorario.solicitud_id == solicitud_id)
            ) or 0)
        assert total == 1
        assert sorted(resultado.idempotente for resultado in resultados) == [False, True]
        assert resultados[0].aplicacion_id == resultados[1].aplicacion_id
    finally:
        async with sesiones_reales() as limpiar:
            for tabla in (
                "nomina_aplicaciones_plantilla_empleados",
                "nomina_aplicaciones_plantilla_horario",
                "nomina_plantillas_horario_historial",
            ):
                await limpiar.execute(text(
                    f"ALTER TABLE {tabla} DISABLE TRIGGER trg_{tabla}_append_only"
                ))
            await limpiar.execute(text("""
                DELETE FROM nomina_aplicaciones_plantilla_empleados
                WHERE aplicacion_id IN (
                    SELECT id FROM nomina_aplicaciones_plantilla_horario
                    WHERE solicitud_id=:solicitud
                )
            """), {"solicitud": solicitud_id})
            await limpiar.execute(delete(NominaAplicacionPlantillaHorario).where(
                NominaAplicacionPlantillaHorario.solicitud_id == solicitud_id
            ))
            await limpiar.execute(text(
                "DELETE FROM nomina_plantillas_horario_historial WHERE plantilla_id=:id"
            ), {"id": plantilla_id})
            await limpiar.execute(delete(OperacionIdempotente).where(
                OperacionIdempotente.solicitud_id == solicitud_id
            ))
            await limpiar.execute(delete(NominaHorarioPactadoDia).where(
                NominaHorarioPactadoDia.cedula == cedula
            ))
            await limpiar.execute(delete(NominaHorarioPactado).where(
                NominaHorarioPactado.cedula == cedula
            ))
            await limpiar.execute(delete(NominaPlantillaHorarioDia).where(
                NominaPlantillaHorarioDia.plantilla_id == plantilla_id
            ))
            await limpiar.execute(delete(NominaPlantillaHorario).where(
                NominaPlantillaHorario.id == plantilla_id
            ))
            await limpiar.execute(delete(Usuario).where(Usuario.id == actor_id))
            for tabla in (
                "nomina_aplicaciones_plantilla_empleados",
                "nomina_aplicaciones_plantilla_horario",
                "nomina_plantillas_horario_historial",
            ):
                await limpiar.execute(text(
                    f"ALTER TABLE {tabla} ENABLE TRIGGER trg_{tabla}_append_only"
                ))
            await limpiar.commit()
