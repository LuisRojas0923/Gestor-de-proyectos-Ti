import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

async def reparar_todas_las_secuencias(conn):
    """
    Sincroniza todas las secuencias de la base de datos con los valores máximos de sus tablas.
    Especialmente útil después de clonaciones o restauraciones de datos.
    """
    logger.info("Iniciando saneamiento de secuencias de base de datos...")
    
    # 1. Reparación específica para Tickets (Formato TKT-XXXX)
    try:
        # Extraemos la parte numérica después de 'TKT-'
        sql_tickets = """
        DO $$
        DECLARE
            max_val INTEGER;
        BEGIN
            -- Obtener el máximo valor numérico de la tabla tickets
            SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) INTO max_val FROM tickets;
            
            -- Si hay datos, ajustar la secuencia
            IF max_val IS NOT NULL THEN
                PERFORM setval('ticket_id_seq', max_val, true);
            END IF;
        END $$;
        """
        await conn.execute(text(sql_tickets))
        logger.info("Secuencia 'ticket_id_seq' sincronizada exitosamente.")
    except Exception as e:
        logger.warning(f"No se pudo sincronizar 'ticket_id_seq' (puede que no exista aún): {e}")

    # 2. Reparación genérica para todas las demás secuencias (SERIAL / IDENTITY)
    try:
        # Esta consulta genera dinámicamente sentencias setval para cada secuencia encontrada
        sql_generico = """
        DO $$
        DECLARE
            row RECORD;
            max_id BIGINT;
            seq_name TEXT;
        BEGIN
            FOR row IN 
                SELECT 
                    t.relname AS table_name, 
                    a.attname AS column_name, 
                    s.relname AS sequence_name
                FROM pg_class s
                JOIN pg_depend d ON d.objid = s.oid
                JOIN pg_class t ON d.refobjid = t.oid
                JOIN pg_attribute a ON (d.refobjid = a.attrelid AND d.refobjsubid = a.attnum)
                WHERE s.relkind = 'S' 
                AND d.classid = 'pg_class'::regclass 
                AND d.refclassid = 'pg_class'::regclass
                AND t.relname != 'tickets' -- Ya manejada arriba
            LOOP
                EXECUTE format('SELECT MAX(%I) FROM %I', row.column_name, row.table_name) INTO max_id;
                IF max_id IS NOT NULL THEN
                    EXECUTE format('SELECT setval(%L, %s, true)', row.sequence_name, max_id);
                END IF;
            END LOOP;
        END $$;
        """
        await conn.execute(text(sql_generico))
        logger.info("Todas las secuencias SERIAL/IDENTITY han sido sincronizadas.")
    except Exception as e:
        logger.error(f"Error durante el saneamiento genérico de secuencias: {e}")

    logger.info("Saneamiento de base de datos completado.")
