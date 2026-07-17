"""Migración idempotente para auditoria_acciones_usuario."""
import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)


async def safe_execute(conn, query: str) -> None:
    await conn.execute(text(query))  # @audit-ok: el job propaga cualquier fallo


async def crear_tabla_auditoria_acciones(conn) -> None:
    logger.info("Iniciando migración: crear tabla auditoria_acciones_usuario...")

    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS auditoria_acciones_usuario (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            usuario_id VARCHAR(50) NOT NULL,
            usuario_nombre VARCHAR(255),
            rol VARCHAR(50),
            modulo VARCHAR(80) NOT NULL,
            accion VARCHAR(50) NOT NULL,
            entidad_tipo VARCHAR(80),
            entidad_id VARCHAR(100),
            metodo_http VARCHAR(10),
            ruta VARCHAR(255),
            codigo_respuesta SMALLINT,
            resultado VARCHAR(20) NOT NULL DEFAULT 'exito',
            direccion_ip VARCHAR(45),
            agente_usuario TEXT,
            correlacion_id VARCHAR(36),
            datos_anteriores JSONB,
            datos_nuevos JSONB,
            metadatos JSONB
        )
        """,
    )

    for idx_sql in (
        "CREATE INDEX IF NOT EXISTS idx_aud_acc_usuario_ts ON auditoria_acciones_usuario (usuario_id, timestamp DESC)",
        "CREATE INDEX IF NOT EXISTS idx_aud_acc_modulo_ts ON auditoria_acciones_usuario (modulo, timestamp DESC)",
        "CREATE INDEX IF NOT EXISTS idx_aud_acc_entidad ON auditoria_acciones_usuario (entidad_tipo, entidad_id)",
        "CREATE INDEX IF NOT EXISTS idx_aud_acc_timestamp ON auditoria_acciones_usuario (timestamp DESC)",
    ):
        await safe_execute(conn, idx_sql)
