import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def ensure_extensions():
    """Asegura que las extensiones necesarias existan en PostgreSQL"""
    try:
        engine = create_async_engine(config.database_url)
        async with engine.connect() as conn:
            # Intentar habilitar pgvector
            logger.info("Intentando habilitar la extensión 'vector'...")
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            await conn.commit()
            logger.info("✅ Extensión 'vector' asegurada.")
            
    except Exception as e:
        logger.error(f"❌ No se pudo habilitar la extensión 'vector': {e}")
        logger.info("Asegúrate de que el usuario de la DB tenga permisos de superusuario o que la extensión esté pre-instalada.")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(ensure_extensions())
