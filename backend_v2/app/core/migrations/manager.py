import logging
from sqlalchemy import text
from sqlmodel import SQLModel
from app.core.migrations.structural_blindaje import ejecutar_blindaje_estructural
from app.core.migrations.saneamiento_secuencias import reparar_todas_las_secuencias

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
                
    except Exception as e:
        logger.error(f"Error fatal en ejecución de seeds: {e}")
