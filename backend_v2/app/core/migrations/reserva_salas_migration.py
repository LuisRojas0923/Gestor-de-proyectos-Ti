import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

logger = logging.getLogger(__name__)

async def desplegar_garantia_concurrente_reservas(conn: AsyncConnection):
    """
    Despliega la extensión btree_gist, resuelve conflictos de solapamiento existentes
    y aplica el constraint de exclusión para evitar concurrencias.
    """
    logger.info("Verificando/Instalando btree_gist para reserva de salas...")
    try:
        async with conn.begin_nested():
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist;"))
    except Exception as e:
        logger.warning(f"No se pudo instalar btree_gist (puede requerir superusuario). Detalles: {e}")

    # Verificar si el constraint ya existe
    try:
        async with conn.begin_nested():
            res = await conn.execute(text(
                "SELECT 1 FROM pg_constraint WHERE conname = 'exclude_overlapping_reservations';"
            ))
            if res.scalar() is not None:
                logger.info("La restricción 'exclude_overlapping_reservations' ya está instalada.")
                return
    except Exception as e:
        logger.warning(f"Error al verificar la restricción: {e}")
        return

    logger.info("Autosanando posibles reservas solapadas antes de aplicar la restricción...")
    # Resolver solapamientos: cancelar las reservas más recientes (por created_at o id) que choquen con otras
    fix_sql = """
    WITH overlapping AS (
        SELECT r2.id
        FROM reservations r1
        JOIN reservations r2 ON r1.room_id = r2.room_id
            AND r1.id != r2.id
            AND r1.status = 'ACTIVE'
            AND r2.status = 'ACTIVE'
            AND r1.start_datetime < r2.end_datetime
            AND r1.end_datetime > r2.start_datetime
        WHERE r1.created_at < r2.created_at
           OR (r1.created_at = r2.created_at AND r1.id < r2.id)
    )
    UPDATE reservations
    SET status = 'CANCELLED',
        cancelled_by_name = 'Sistema (Auto-Sanación)',
        updated_at = NOW()
    WHERE id IN (SELECT id FROM overlapping);
    """
    try:
        async with conn.begin_nested():
            await conn.execute(text(fix_sql))
    except Exception as e:
        logger.error(f"Error al sanar reservas solapadas: {e}")
        return

    logger.info("Aplicando ExcludeConstraint estructural a reservations...")
    alter_sql = """
    ALTER TABLE reservations
    ADD CONSTRAINT exclude_overlapping_reservations
    EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(start_datetime, end_datetime, '()') WITH &&
    )
    WHERE (status = 'ACTIVE');
    """
    try:
        async with conn.begin_nested():
            await conn.execute(text(alter_sql))
        logger.info("Restricción 'exclude_overlapping_reservations' aplicada con éxito.")
    except Exception as e:
        logger.error(f"No se pudo aplicar ExcludeConstraint (¿Falta btree_gist?). Detalles: {e}")
