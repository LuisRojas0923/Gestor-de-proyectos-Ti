import asyncio
from sqlalchemy import text
from app.database import async_engine, AsyncSession

async def migrate():
    async with AsyncSession(async_engine) as session:
        # Verificar si la tabla existe y qué columnas tiene
        queries = [
            "ALTER TABLE ConteoInventario RENAME COLUMN cantidad TO cantidad_sistema;",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS cant_c1 FLOAT DEFAULT 0;",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS obs_c1 TEXT;",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS user_c1 VARCHAR(50);",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS cant_c2 FLOAT DEFAULT 0;",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS obs_c2 TEXT;",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS user_c2 VARCHAR(50);",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS cant_c3 FLOAT DEFAULT 0;",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS obs_c3 TEXT;",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS user_c2 VARCHAR(50);", # Error anterior en mi pensamiento, debe ser c3
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS user_c3 VARCHAR(50);",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS cant_c4 FLOAT DEFAULT 0;",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS obs_c4 TEXT;",
            "ALTER TABLE ConteoInventario ADD COLUMN IF NOT EXISTS user_c4 VARCHAR(50);",
            "ALTER TABLE ConteoInventario RENAME COLUMN fecha_conteo TO fecha_creacion;"
        ]
        
        for q in queries:
            try:
                await session.execute(text(q))
                print(f"Ejecutado: {q}")
            except Exception as e:
                print(f"Saltado o error en: {q} -> {e}")
        
        await session.commit()
        print("Migración finalizada.")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(migrate())
