import logging
from sqlalchemy import text
from sqlmodel import SQLModel
from app.core.migrations.structural_blindaje import ejecutar_blindaje_estructural
from app.core.migrations.saneamiento_secuencias import reparar_todas_las_secuencias
from app.core.migrations.auditoria_evento_migration import crear_tabla_auditoria_evento
from app.core.migrations.auditoria_acciones_migration import crear_tabla_auditoria_acciones
from app.core.migrations.horas_extras_migration import (
    crear_tablas_horas_extras,
    crear_tabla_workflow_evento,
    crear_tabla_festivo_calendario,
    crear_tabla_novedad_evento,
    crear_tabla_horario_pactado_dia,
)
from app.core.migrations.horas_extras_migration_s6 import (
    agregar_ot_a_calculo_semanal,
    crear_tabla_bolsa_ot_override,
)
from app.core.migrations.horas_extras_migration_s8 import crear_tabla_planificador_dia_ot
from app.core.migrations.horas_extras_migration_s10 import crear_tabla_calculo_diario_detalle
from app.core.migrations.horarios_relaciones_migration import migrar_horarios_relaciones

logger = logging.getLogger(__name__)

async def init_db_process(async_engine, AsyncSessionLocal):
    """
    Proceso completo de inicialización y mantenimiento de la base de datos.
    Cada fase usa su propia transacción para que un fallo no contamine las siguientes.
    """
    # 1. Crear tablas base si no existen
    async with async_engine.begin() as conn:
        try:
            await conn.run_sync(SQLModel.metadata.create_all)
            
            # Migración automática para la tabla biométrica en caso de que ya existiera sin la nueva columna
            try:
                # Se añaden todas las columnas que pudieron haber sido agregadas después de la creación inicial de la tabla
                migraciones = [
                    "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS evidencia_url VARCHAR(255);",
                    "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS latitud_marcada FLOAT DEFAULT 0.0;",
                    "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS longitud_marcada FLOAT DEFAULT 0.0;",
                    "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS nivel_confianza FLOAT DEFAULT 0.0;",
                    "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS match_exitoso BOOLEAN DEFAULT FALSE;",
                    "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS zona_id INTEGER;",
                ]
                for query in migraciones:
                    await conn.execute(text(query))
            except Exception as inner_e:
                logger.warning(f"No se pudo alterar registros_asistencia (puede que la tabla aún no exista o ya tenga la columna): {inner_e}")
        except Exception as e:
            logger.warning(f"Error concurrente en create_all: {e}")

    # 2. Ejecutar Blindaje Estructural (ALTER TABLEs)
    async with async_engine.begin() as conn:
        try:
            await ejecutar_blindaje_estructural(conn)
        except Exception as e:
            logger.error(f"Error en blindaje estructural: {e}")

    # 3. Saneamiento de Secuencias (AUTOSANACIÓN)
    async with async_engine.begin() as conn:
        try:
            await reparar_todas_las_secuencias(conn)
        except Exception as e:
            logger.error(f"Error en saneamiento de secuencias: {e}")

    # 3.5 Crear tabla auditoria_eventos (registro de intentos de verify-admin)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_auditoria_evento(conn)
        except Exception as e:
            logger.error(f"Error en migración auditoria_eventos: {e}")

    # 3.6 Crear tabla auditoria_acciones_usuario (trazabilidad transversal)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_auditoria_acciones(conn)
        except Exception as e:
            logger.error(f"Error en migración auditoria_acciones_usuario: {e}")

    # 3.7 Crear tablas del módulo Horas Extras y Novedades (S0 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tablas_horas_extras(conn)
        except Exception as e:
            logger.error(f"Error en migración horas_extras: {e}")

    # 3.8 Crear tabla de eventos de workflow de cálculo (S4 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_workflow_evento(conn)
        except Exception as e:
            logger.error(f"Error en migración workflow_evento (S4): {e}")

    # 3.9 Crear tabla de festivos del calendario (S5' sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_festivo_calendario(conn)
        except Exception as e:
            logger.error(f"Error en migración festivo_calendario (S5'): {e}")

    # 3.10 Crear tabla de eventos de novedades (S5 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_novedad_evento(conn)
        except Exception as e:
            logger.error(f"Error en migración nomina_novedad_evento (S5): {e}")

    # 3.11 Crear tabla de detalle diario del horario pactado (S5'' sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_horario_pactado_dia(conn)
        except Exception as e:
            logger.error(f"Error en migración nomina_horario_pactado_dia (S5''): {e}")

    # 3.12 Agregar ot_id/ot_codigo a nomina_calculo_semanal (Fix S4)
    async with async_engine.begin() as conn:
        try:
            await agregar_ot_a_calculo_semanal(conn)
        except Exception as e:
            logger.error(f"Error en migración agregar_ot_a_calculo_semanal (Fix S4): {e}")

    # 3.13 Crear tabla nomina_bolsa_ot_override (S6 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_bolsa_ot_override(conn)
        except Exception as e:
            logger.error(f"Error en migración nomina_bolsa_ot_override (S6): {e}")

    # 3.14 Crear tabla de asignaciones OT/CC por dia (S8 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_planificador_dia_ot(conn)
        except Exception as e:
            logger.error(f"Error en migración nomina_planificador_dia_ot (S8): {e}")

    # 3.15 Crear tabla de snapshot diario confirmado (S10)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_calculo_diario_detalle(conn)
        except Exception as e:
            logger.error(f"Error en migración nomina_calculo_diario_detalle (S10): {e}")

    # 3.16 Migracion critica: debe abortar el arranque ante cualquier fallo.
    async with async_engine.begin() as conn:
        await migrar_horarios_relaciones(conn)

    # 4. Saneamiento de Datos (Inventario y otros)
    saneamientos = [
        "UPDATE conteoinventario SET estado = 'PENDIENTE' WHERE estado IS NULL;",
        "UPDATE conteoinventario SET invporlegalizar = 0 WHERE invporlegalizar IS NULL;",
        "UPDATE conteoinventario SET bodega = TRIM(bodega), bloque = TRIM(bloque), estante = TRIM(estante);"
    ]
    for sql in saneamientos:
        async with async_engine.begin() as conn:
            try:
                await conn.execute(text(sql))
            except Exception as e:
                logger.warning(f"Error en saneamiento (ignorado): {e}")

    # 4. Semillado de Datos Maestros (Admin, Salas)
    await ejecutar_seeds(AsyncSessionLocal)

    # 5. Seeds del módulo Horas Extras (catálogo + factores ARL + parámetros legales)
    try:
        from app.services.novedades_nomina.seed_horas_extras import seed_horas_extras_completo
        await seed_horas_extras_completo()
        logger.info("Seeds de Horas Extras cargados.")
    except Exception as e:
        logger.error(f"Error cargando seeds de horas extras: {e}")

async def ejecutar_seeds(AsyncSessionLocal):
    """Ejecuta los semilleros de datos necesarios"""
    try:
        from app.models.auth.usuario import Usuario
        from app.models.desarrollo.desarrollo import TipoDesarrollo
        from app.services.auth.servicio import ServicioAuth
        from app.models.reserva_salas.models import Room
        import uuid
        from sqlmodel import select

        async with AsyncSessionLocal() as session:
            # Seed Usuario Admin
            try:
                result = await session.execute(select(Usuario).where(Usuario.cedula == "admin"))
                if result.scalar_one_or_none() is None:
                    admin = Usuario(
                        id="admin-01",
                        cedula="admin",
                        nombre="Administrador Sistema",
                        rol="admin",
                        hash_contrasena=ServicioAuth.obtener_hash_contrasena("admin123"),
                        esta_activo=True,
                    )
                    session.add(admin)
                    await session.commit()
                    logger.info("Usuario administrador creado por defecto.")
            except Exception as e:
                logger.warning(f"Error al verificar/crear admin seed: {e}")

            # Seed Sala de reuniones
            try:
                room_id = uuid.UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
                result_room = await session.execute(select(Room).where(Room.id == room_id))
                if result_room.scalars().first() is None:
                    session.add(Room(
                        id=room_id,
                        name="Sala de reuniones 1",
                        capacity=10,
                        resources=["Proyector", "Pizarra"],
                        is_active=True,
                        notes="Sala principal",
                    ))
                    await session.commit()
            except Exception as e:
                logger.warning(f"Error al verificar/crear sala seed: {e}")

            # Seed tipos de desarrollo
            try:
                tipos_desarrollo = [
                    ("Proyecto", "Proyecto", 1),
                    ("Mejora", "Mejora", 2),
                    ("Soporte", "Soporte", 3),
                    ("Renovación", "Renovación", 4),
                    ("Actividad frecuente", "Actividad frecuente", 5),
                    ("Actividad", "Actividad", 6),
                ]
                for valor, etiqueta, orden in tipos_desarrollo:
                    result_tipo = await session.execute(
                        select(TipoDesarrollo).where(TipoDesarrollo.valor == valor)
                    )
                    if result_tipo.scalar_one_or_none() is None:
                        session.add(TipoDesarrollo(valor=valor, etiqueta=etiqueta, orden=orden))
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.warning(f"Error al verificar/crear tipos de desarrollo seed: {e}")
                
    except Exception as e:
        logger.error(f"Error fatal en ejecución de seeds: {e}")
