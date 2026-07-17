import logging
import os
import re
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
from app.core.migrations.schema_verifier import verificar_esquema_runtime

logger = logging.getLogger(__name__)

MIGRATION_ADVISORY_LOCK_ID = 742019260716

async def ejecutar_migraciones(async_engine, AsyncSessionLocal):
    """Ejecuta una sola instancia del job migrador por base de datos."""
    async with async_engine.connect() as lock_conn:
        await lock_conn.execute(  # @audit-ok: lock del job fail-fast
            text("SELECT pg_advisory_lock(:lock_id)"),
            {"lock_id": MIGRATION_ADVISORY_LOCK_ID},
        )
        try:
            await init_db_process(async_engine, AsyncSessionLocal)
            async with AsyncSessionLocal() as session:
                await preparar_integridad_rbac(session)
                await sembrar_roles_sistema(session)
                from app.core.migrations.bootstrap_admin import asegurar_admin_inicial
                await asegurar_admin_inicial(session)
                await verificar_admin_preexistente(session)
                from app.services.auth.rbac_discovery import sincronizar_manifiesto_rbac
                await sincronizar_manifiesto_rbac(session)
            async with AsyncSessionLocal() as session:
                from app.core.migrations.auth_runtime_protection import instalar_proteccion_auth_runtime
                from app.core.migrations.rbac_admin_procedures import instalar_procedimientos_admin
                from app.core.rbac_capability import obtener_capacidad_rbac
                await instalar_proteccion_auth_runtime(
                    session, os.environ["DATABASE_RUNTIME_ROLE"]
                )
                await instalar_procedimientos_admin(
                    session,
                    os.environ["DATABASE_RUNTIME_ROLE"],
                    obtener_capacidad_rbac(),
                )
                await aplicar_privilegios_runtime(session)
        finally:
            await lock_conn.execute(  # @audit-ok: unlock en finally
                text("SELECT pg_advisory_unlock(:lock_id)"),
                {"lock_id": MIGRATION_ADVISORY_LOCK_ID},
            )


async def preparar_integridad_rbac(session):
    """Consolida permisos duplicados y crea la clave natural de RBAC."""
    await session.execute(text("""  # @audit-ok: migración fail-fast
        WITH duplicados AS (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY rol, modulo ORDER BY permitido DESC, id
            ) AS posicion
            FROM public.permisos_rol
        )
        DELETE FROM public.permisos_rol
        WHERE id IN (SELECT id FROM duplicados WHERE posicion > 1)
    """))
    await session.execute(text("""  # @audit-ok: migración fail-fast
        DROP INDEX IF EXISTS public.ux_permisos_rol_rol_modulo
    """))
    await session.execute(text("""  # @audit-ok: migración fail-fast
        CREATE UNIQUE INDEX ux_permisos_rol_rol_modulo
        ON public.permisos_rol (rol, modulo)
    """))
    await session.commit()


async def verificar_admin_preexistente(session):
    """Evita desplegar una instancia nueva sin una cuenta administrativa."""
    admin = await session.execute(text("""  # @audit-ok: verificación fail-fast
        SELECT 1
        FROM public.usuarios
        WHERE esta_activo = TRUE AND rol = 'admin'
        LIMIT 1
    """))
    if admin.first() is None:
        raise RuntimeError(
            "No existe un administrador activo; aprovisione uno antes de migrar"
        )


async def sembrar_roles_sistema(session):
    roles = (
        ("admin", "Administrador", True),
        ("admin_sistemas", "Sistemas", True),
        ("manager", "Gerente", True),
        ("analyst", "Analista TI", True),
        ("director", "Director Proyectos", True),
        ("viaticante", "Viaticante", True),
        ("usuario", "Usuario Estándar", True),
    )
    for role_id, nombre, es_sistema in roles:
        await session.execute(text("""  # @audit-ok: seed idempotente fail-fast
            INSERT INTO public.roles_sistema (id, nombre, es_sistema)
            VALUES (:id, :nombre, :es_sistema)
            ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre
        """), {"id": role_id, "nombre": nombre, "es_sistema": es_sistema})
    await session.commit()


async def aplicar_privilegios_runtime(session):
    """Concede CRUD general y revoca DDL/escritura directa sobre RBAC."""
    runtime_role = os.getenv("DATABASE_RUNTIME_ROLE", "").strip()
    owner_role = os.getenv("DATABASE_SCHEMA_OWNER_ROLE", "").strip()
    patron = r"[A-Za-z_][A-Za-z0-9_]*"
    if not runtime_role or not owner_role:
        raise RuntimeError("Faltan roles PostgreSQL para aplicar privilegios runtime")
    if re.fullmatch(patron, runtime_role) is None or re.fullmatch(patron, owner_role) is None:
        raise RuntimeError("Los roles PostgreSQL configurados no son válidos")

    sentencias = (
        f"GRANT USAGE ON SCHEMA public TO {runtime_role}",
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {runtime_role}",
        f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {runtime_role}",
        f"REVOKE CREATE ON SCHEMA public FROM {runtime_role}",
        f"REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.modulos_sistema, public.permisos_rol, public.roles_sistema FROM {runtime_role}",
        f"REVOKE ALL ON TABLE public.configuracion_seguridad_runtime FROM {runtime_role}",
        f"ALTER DEFAULT PRIVILEGES FOR ROLE {owner_role} IN SCHEMA public "
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {runtime_role}",
        f"ALTER DEFAULT PRIVILEGES FOR ROLE {owner_role} IN SCHEMA public "
        f"GRANT USAGE, SELECT ON SEQUENCES TO {runtime_role}",
    )
    for sentencia in sentencias:
        await session.execute(text(sentencia))  # @audit-ok: migración fail-fast
    await session.commit()

async def init_db_process(async_engine, AsyncSessionLocal):
    """
    Proceso completo de inicialización y mantenimiento de la base de datos.
    Cada fase usa su propia transacción para que un fallo no contamine las siguientes.
    """
    # 1. Crear tablas base si no existen
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await conn.execute(text("CREATE SEQUENCE IF NOT EXISTS public.ticket_id_seq"))  # @audit-ok: migración fail-fast
        await conn.execute(text("""  # @audit-ok: migración fail-fast
            UPDATE public.sesiones
            SET token_sesion = encode(sha256(convert_to(token_sesion, 'UTF8')), 'hex')
            WHERE token_sesion !~ '^[0-9a-f]{64}$'
        """))

        migraciones = [
            "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS evidencia_url VARCHAR(255);",
            "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS latitud_marcada FLOAT DEFAULT 0.0;",
            "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS longitud_marcada FLOAT DEFAULT 0.0;",
            "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS nivel_confianza FLOAT DEFAULT 0.0;",
            "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS match_exitoso BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS zona_id INTEGER;",
        ]
        for query in migraciones:
            await conn.execute(text(query))  # @audit-ok: migración fail-fast

    # 2. Ejecutar Blindaje Estructural (ALTER TABLEs)
    async with async_engine.begin() as conn:
        try:
            await ejecutar_blindaje_estructural(conn)
        except Exception:
            logger.error("Error en blindaje estructural")
            raise

    # 3. Saneamiento de Secuencias (AUTOSANACIÓN)
    async with async_engine.begin() as conn:
        try:
            await reparar_todas_las_secuencias(conn)
        except Exception:
            logger.error("Error en saneamiento de secuencias")
            raise

    # 3.5 Crear tabla auditoria_eventos (registro de intentos de verify-admin)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_auditoria_evento(conn)
        except Exception:
            logger.error("Error en migración auditoria_eventos")
            raise

    # 3.6 Crear tabla auditoria_acciones_usuario (trazabilidad transversal)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_auditoria_acciones(conn)
        except Exception:
            logger.error("Error en migración auditoria_acciones_usuario")
            raise

    # 3.7 Crear tablas del módulo Horas Extras y Novedades (S0 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tablas_horas_extras(conn)
        except Exception:
            logger.error("Error en migración horas_extras")
            raise

    # 3.8 Crear tabla de eventos de workflow de cálculo (S4 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_workflow_evento(conn)
        except Exception:
            logger.error("Error en migración workflow_evento (S4)")
            raise

    # 3.9 Crear tabla de festivos del calendario (S5' sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_festivo_calendario(conn)
        except Exception:
            logger.error("Error en migración festivo_calendario (S5')")
            raise

    # 3.10 Crear tabla de eventos de novedades (S5 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_novedad_evento(conn)
        except Exception:
            logger.error("Error en migración nomina_novedad_evento (S5)")
            raise

    # 3.11 Crear tabla de detalle diario del horario pactado (S5'' sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_horario_pactado_dia(conn)
        except Exception:
            logger.error("Error en migración nomina_horario_pactado_dia (S5'')")
            raise

    # 3.12 Agregar ot_id/ot_codigo a nomina_calculo_semanal (Fix S4)
    async with async_engine.begin() as conn:
        try:
            await agregar_ot_a_calculo_semanal(conn)
        except Exception:
            logger.error("Error en migración agregar_ot_a_calculo_semanal (Fix S4)")
            raise

    # 3.13 Crear tabla nomina_bolsa_ot_override (S6 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_bolsa_ot_override(conn)
        except Exception:
            logger.error("Error en migración nomina_bolsa_ot_override (S6)")
            raise

    # 3.14 Crear tabla de asignaciones OT/CC por dia (S8 sprint)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_planificador_dia_ot(conn)
        except Exception:
            logger.error("Error en migración nomina_planificador_dia_ot (S8)")
            raise

    # 3.15 Crear tabla de snapshot diario confirmado (S10)
    async with async_engine.begin() as conn:
        try:
            await crear_tabla_calculo_diario_detalle(conn)
        except Exception:
            logger.error("Error en migración nomina_calculo_diario_detalle (S10)")
            raise

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
            except Exception:
                logger.error("Error en saneamiento")
                raise

    # 4. Semillado de Datos Maestros (Admin, Salas)
    await ejecutar_seeds(AsyncSessionLocal)

    # 5. Seeds del módulo Horas Extras (catálogo + factores ARL + parámetros legales)
    try:
        from app.services.novedades_nomina.seed_horas_extras import seed_horas_extras_completo
        await seed_horas_extras_completo(AsyncSessionLocal)
        logger.info("Seeds de Horas Extras cargados.")
    except Exception:
        logger.error("Error cargando seeds de horas extras")
        raise

async def ejecutar_seeds(AsyncSessionLocal):
    """Ejecuta los semilleros de datos necesarios"""
    try:
        from app.models.desarrollo.desarrollo import TipoDesarrollo
        from app.models.reserva_salas.models import Room
        import uuid
        from sqlmodel import select

        async with AsyncSessionLocal() as session:
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
            except Exception:
                logger.error("Error al verificar/crear sala seed")
                raise

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
            except Exception:
                await session.rollback()
                logger.error("Error al verificar/crear tipos de desarrollo seed")
                raise

    except Exception:
        logger.error("Error fatal en ejecución de seeds")
        raise
