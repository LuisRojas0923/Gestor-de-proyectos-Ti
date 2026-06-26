import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def update_schema():
    async with AsyncSessionLocal() as db:
        await db.execute(text("ALTER TABLE registros_asistencia ADD COLUMN IF NOT EXISTS evidencia_url VARCHAR(255);"))
        await db.commit()
    print("Columna evidencia_url agregada exitosamente.")

if __name__ == "__main__":
    asyncio.run(update_schema())
