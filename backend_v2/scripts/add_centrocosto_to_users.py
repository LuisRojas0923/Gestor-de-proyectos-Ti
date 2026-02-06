import asyncio
from sqlalchemy import text
from app.database import async_engine

async def add_centrocosto_column():
    print("Verificando columna centrocosto en tabla usuarios...")
    async with async_engine.begin() as conn:
        # Verificar si la columna existe
        res = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'usuarios' AND column_name = 'centrocosto'
        """))
        if not res.fetchone():
            print("Agregando columna centrocosto...")
            await conn.execute(text("ALTER TABLE usuarios ADD COLUMN centrocosto VARCHAR(255)"))
            print("Columna agregada exitosamente.")
        else:
            print("La columna ya existe.")

if __name__ == "__main__":
    asyncio.run(add_centrocosto_column())
