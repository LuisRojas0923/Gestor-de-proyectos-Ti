import asyncio
from sqlalchemy import text
from app.database import engine

async def run_migration():
    print("Iniciando migración de estados de inventario...")
    try:
        async with engine.begin() as conn:
            # Añadir columna estado
            await conn.execute(text("ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'PENDIENTE';"))
            # Añadir columna diferencia
            await conn.execute(text("ALTER TABLE conteoinventario ADD COLUMN IF NOT EXISTS diferencia FLOAT DEFAULT 0.0;"))
            
            print("Migración completada exitosamente.")
    except Exception as e:
        print(f"Error durante la migración: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(run_migration())
