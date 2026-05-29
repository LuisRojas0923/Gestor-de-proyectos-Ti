from sqlmodel import SQLModel
import asyncio
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde la ruta correcta
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

from app.database import async_engine
from app.database import async_engine
from app.models.novedades_nomina.nomina import ControlDescuentoActivo

async def main():
    print("Creando tabla ControlDescuentoActivo...")
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    print("Tabla creada.")

if __name__ == "__main__":
    asyncio.run(main())
