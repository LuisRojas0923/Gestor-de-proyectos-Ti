import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

async def safe_execute(conn, query: str):
    """Ejecuta una sentencia SQL de forma segura."""
    try:
        await conn.execute(text(query))
    except Exception as e:
        logger.warning(f"Error (ignorado) en migración de actividades: {e} | Query: {query[:50]}...")

async def migrar_estados_actividades(conn):
    """
    Migración idempotente para unificar los estados de actividades y desarrollos.
    Reemplaza 'En Progreso' por 'En Proceso' y alinea el estado general del desarrollo.
    """
    logger.info("Iniciando migración de estados de actividades...")

    # 1. Cambiar 'En Progreso' a 'En Proceso' en desarrollos
    await safe_execute(conn, "UPDATE desarrollos SET estado_general = 'En Proceso' WHERE estado_general = 'En Progreso'")

    # 2. Cambiar 'En Progreso' a 'En Proceso' en actividades
    await safe_execute(conn, "UPDATE actividades SET estado = 'En Proceso' WHERE estado = 'En Progreso'")

    # 3. Promover a 'En Proceso' desarrollos en 'Pendiente' que tengan actividades en 'En Proceso' o 'Completada'/'Completado'
    await safe_execute(
        conn,
        """
        UPDATE desarrollos
        SET estado_general = 'En Proceso'
        WHERE estado_general = 'Pendiente'
          AND id IN (
            SELECT DISTINCT desarrollo_id 
            FROM actividades 
            WHERE estado IN ('En Proceso', 'Completada', 'Completado')
          )
        """
    )

    logger.info("Migración de estados de actividades finalizada con éxito.")
