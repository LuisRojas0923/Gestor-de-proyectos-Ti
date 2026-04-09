import asyncio
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.database import async_engine, AsyncSession

async def init_config():
    async with AsyncSession(async_engine) as session:
        try:
            # 1. Crear la tabla manualmente (SQLModel.metadata.create_all alternativo)
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS configuracioninventario (
                id SERIAL PRIMARY KEY,
                ronda_activa INTEGER DEFAULT 1,
                conteo_nombre VARCHAR(100),
                ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            await session.execute(text(create_table_sql))
            print("Tabla configuracioninventario verificada/creada.")

            # 2. Insertar configuración inicial si no existe
            init_sql = """
            INSERT INTO configuracioninventario (id, ronda_activa)
            VALUES (1, 1)
            ON CONFLICT (id) DO NOTHING;
            """
            await session.execute(text(init_sql))
            await session.commit()
            print("Configuración inicial de inventario establecida (Ronda 1).")
        except SQLAlchemyError as e:
            await session.rollback()
            print(f"CRITICAL ERROR DB: No se pudo inicializar la configuración de inventario: {e}")
            raise e
        except Exception as e:
            print(f"CRITICAL ERROR UNEXPECTED: {e}")
            raise e

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(init_config())
