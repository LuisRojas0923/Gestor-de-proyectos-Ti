"""
Migración idempotente para crear la tabla auditoria_eventos.

Sigue el patrón de actividades_migration.py / structural_blindaje.py:
función safe_execute + función principal de migración.
"""
import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)


async def safe_execute(conn, query: str) -> None:
    """Ejecuta una sentencia y propaga cualquier fallo al job migrador."""
    await conn.execute(text(query))  # @audit-ok: el job propaga cualquier fallo


async def crear_tabla_auditoria_evento(conn) -> None:
    """
    Crea la tabla auditoria_eventos y sus índices.
    Idempotente: IF NOT EXISTS en CREATE TABLE / CREATE INDEX.
    """
    logger.info("Iniciando migración: crear tabla auditoria_eventos...")

    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS public.auditoria_eventos (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            usuario_id VARCHAR(50) NOT NULL,
            rol VARCHAR(50) NOT NULL,
            direccion_ip VARCHAR(45),
            agente_usuario TEXT,
            resultado VARCHAR(30) NOT NULL,
            motivo TEXT,
            endpoint VARCHAR(100) NOT NULL DEFAULT '/api/v2/config/verify-admin'
        )
        """,
    )

    await safe_execute(conn, "DROP INDEX IF EXISTS public.idx_auditoria_usuario_ts")
    await safe_execute(conn, """
        CREATE INDEX idx_auditoria_usuario_ts
        ON public.auditoria_eventos (usuario_id, timestamp)
    """)
    await safe_execute(conn, "DROP INDEX IF EXISTS public.idx_auditoria_resultado")
    await safe_execute(conn, """
        CREATE INDEX idx_auditoria_resultado
        ON public.auditoria_eventos (resultado)
    """)
