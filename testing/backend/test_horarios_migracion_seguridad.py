"""Integridad PostgreSQL y carácter crítico de la migración de horarios."""
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.core.migrations.horarios_relaciones_migration import migrar_horarios_relaciones
from app.core.migrations import manager
from app.models.novedades_nomina.schemas_plantillas_horario import PlantillaHorarioCreate
from app.models.auth.usuario import Usuario
from app.services.auth.alcance_empleados_service import cambiar_relaciones
from app.services.novedades_nomina.plantillas_horario_service import (
    aplicar_plantilla, crear_plantilla,
)
from testing.backend.test_horarios_plantillas_service import (
    _actor, _dias, _sesion_reversible,
)


CONSTRAINTS = {
    "ck_plantilla_version_positiva",
    "ck_plantilla_dia_rango",
    "ck_plantilla_almuerzo_rango",
    "ck_plantilla_horas_par",
    "uq_aplicacion_solicitud_plantilla",
    "uq_relacion_gestor_empleado",
}


@pytest.mark.asyncio
async def test_migracion_repara_constraints_faltantes_y_rechaza_datos_invalidos(db_session):
    async with _sesion_reversible(db_session) as session:
        for nombre in CONSTRAINTS:
            tabla = (
                "nomina_plantillas_horario_dias"
                if nombre.startswith("ck_plantilla_dia")
                or nombre.startswith("ck_plantilla_almuerzo")
                or nombre.startswith("ck_plantilla_horas")
                else "nomina_aplicaciones_plantilla_horario"
                if nombre.startswith("uq_aplicacion")
                else "relaciones_gestor_empleado"
                if nombre.startswith("uq_relacion")
                else "nomina_plantillas_horario"
            )
            await session.execute(text(
                f"ALTER TABLE {tabla} DROP CONSTRAINT IF EXISTS {nombre}"
            ))
        await migrar_horarios_relaciones(session)
        encontrados = set((await session.execute(text("""
            SELECT conname FROM pg_constraint WHERE conname = ANY(:nombres)
        """), {"nombres": list(CONSTRAINTS)})).scalars().all())
        assert encontrados == CONSTRAINTS

        actor = await _actor(session)
        nested = await session.begin_nested()
        with pytest.raises(DBAPIError):
            await session.execute(text("""
                INSERT INTO nomina_plantillas_horario
                    (id, nombre, version, esta_activa, creado_por_id, actualizado_por_id)
                VALUES (gen_random_uuid(), 'Inválida', 0, true, :actor, :actor)
            """), {"actor": actor.id})
        await nested.rollback()


@pytest.mark.asyncio
async def test_triggers_append_only_rechazan_update_y_delete(db_session):
    async with _sesion_reversible(db_session) as session:
        actor = await _actor(session)
        plantilla = await crear_plantilla(
            session, PlantillaHorarioCreate(nombre="Append only test", dias=_dias()), actor
        )
        cedula = "7" + str(uuid4().int)[:20]
        aplicacion = await aplicar_plantilla(
            session, plantilla.id, uuid4(), [cedula], actor
        )
        gestor = Usuario(
            id=f"GES-{uuid4().hex[:10]}", cedula=str(uuid4().int)[:25],
            hash_contrasena="hash", nombre="Gestor append", rol="gestor",
        )
        session.add(gestor)
        await session.commit()
        await cambiar_relaciones(session, uuid4(), gestor.id, actor, [cedula], [])
        objetivos = [
            ("nomina_plantillas_horario_historial", "plantilla_id", plantilla.id),
            ("nomina_aplicaciones_plantilla_horario", "id", aplicacion.aplicacion_id),
            ("nomina_aplicaciones_plantilla_empleados", "aplicacion_id", aplicacion.aplicacion_id),
            (
                "historial_relaciones_gestor_empleado", "relacion_id",
                await session.scalar(text("""
                    SELECT id FROM relaciones_gestor_empleado
                    WHERE gestor_usuario_id=:gestor LIMIT 1
                """), {"gestor": gestor.id}),
            ),
        ]
        for tabla, columna, valor in objetivos:
            for operacion in ("UPDATE", "DELETE"):
                nested = await session.begin_nested()
                sentencia = (
                    f"UPDATE {tabla} SET creado_en=creado_en WHERE {columna}=:valor"
                    if operacion == "UPDATE"
                    else f"DELETE FROM {tabla} WHERE {columna}=:valor"
                )
                with pytest.raises(DBAPIError, match="append-only"):
                    await session.execute(text(sentencia), {"valor": valor})
                await nested.rollback()


class _ContextoConexion:
    async def __aenter__(self):
        return SimpleNamespace(run_sync=AsyncMock(), execute=AsyncMock())

    async def __aexit__(self, *_args):
        return False


class _EngineFake:
    def begin(self):
        return _ContextoConexion()


@pytest.mark.asyncio
async def test_fallo_migracion_critica_se_propaga(monkeypatch):
    async def noop(*_args, **_kwargs):
        return None

    for nombre in (
        "ejecutar_blindaje_estructural", "reparar_todas_las_secuencias",
        "crear_tabla_auditoria_evento", "crear_tabla_auditoria_acciones",
        "crear_tablas_horas_extras", "crear_tabla_workflow_evento",
        "crear_tabla_festivo_calendario", "crear_tabla_novedad_evento",
        "crear_tabla_horario_pactado_dia", "agregar_ot_a_calculo_semanal",
        "crear_tabla_bolsa_ot_override", "crear_tabla_planificador_dia_ot",
        "crear_tabla_calculo_diario_detalle",
    ):
        monkeypatch.setattr(manager, nombre, noop)

    async def fallar(_conn):
        raise RuntimeError("migración crítica fallida")

    monkeypatch.setattr(manager, "migrar_horarios_relaciones", fallar)
    with pytest.raises(RuntimeError, match="crítica fallida"):
        await manager.init_db_process(_EngineFake(), AsyncMock())
