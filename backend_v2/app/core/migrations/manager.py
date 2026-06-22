import logging
from sqlalchemy import text
from sqlmodel import SQLModel
from app.core.migrations.structural_blindaje import ejecutar_blindaje_estructural
from app.core.migrations.saneamiento_secuencias import reparar_todas_las_secuencias
from app.core.migrations.auditoria_evento_migration import crear_tabla_auditoria_evento
from app.core.migrations.auditoria_acciones_migration import crear_tabla_auditoria_acciones

# Importar todos los modelos para que SQLModel.metadata los registre
import app.models.rrhh  # noqa: F401 — Requisición de Personal

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

    # Seed catálogos del módulo Requisición de Personal
    try:
        async with AsyncSessionLocal() as session:
            await seed_catalogos_rp(session)
    except Exception as e:
        logger.warning(f"Error en seed_catalogos_rp: {e}")

async def seed_catalogos_rp(session):
    """Inserta áreas, cargos y ciudades iniciales para el módulo RP si no existen."""
    from app.models.rrhh.catalogos import AreaRP, CargoRP, CiudadRP
    from sqlmodel import select

    # Si ya existen áreas registradas en el sistema, omitimos todo el semillado por código
    # para permitir que el módulo dinámico controle todo el ciclo de vida de los catálogos.
    result_existente = await session.execute(select(AreaRP).limit(1))  # [CONTROLADO]
    if result_existente.scalars().first() is not None:
        logger.info("[RP Seed] Ya existen registros de áreas. Omitiendo semillado estático.")
        return

    AREAS_CARGOS = {
        "ADMINISTRACIÓN": [
            "Coordinador administrativo DTI",
            "Auxiliar servicios generales",
            "Director administrativo",
            "Jefe de gestión humana",
        ]
    }

    CIUDADES = [
        "BOGOTÁ", "MEDELLÍN", "CALI", "BARRANQUILLA", "BUCARAMANGA"
    ]

    try:
        # Seed áreas y cargos iniciales (solo como bootstrap)
        for area_nombre, cargos in AREAS_CARGOS.items():
            res = await session.execute(select(AreaRP).where(AreaRP.nombre == area_nombre))
            area = res.scalar_one_or_none()
            if not area:
                area = AreaRP(nombre=area_nombre)
                session.add(area)
                await session.flush()
                logger.info(f"[RP Seed] Bootstrap: Área creada: {area_nombre}")

            for cargo_nombre in cargos:
                res_c = await session.execute(
                    select(CargoRP).where(
                        CargoRP.area_id == area.id, CargoRP.nombre == cargo_nombre
                    )
                )
                if res_c.scalar_one_or_none() is None:
                    session.add(CargoRP(area_id=area.id, nombre=cargo_nombre))

        # Seed ciudades iniciales
        for ciudad_nombre in CIUDADES:
            res = await session.execute(select(CiudadRP).where(CiudadRP.nombre == ciudad_nombre))
            if res.scalar_one_or_none() is None:
                session.add(CiudadRP(nombre=ciudad_nombre))

        await session.commit()
        logger.info("[RP Seed] Bootstrap de catálogos RP completado.")
    except Exception as e:
        await session.rollback()
        logger.warning(f"[RP Seed] Error en bootstrap de catálogos RP: {e}")
