import asyncio
import sys
import os
import json

# Añadir el directorio raíz del backend al path para poder importar los módulos
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Forzar DB_HOST a localhost si no está definido o es 'db' (cuando se corre fuera de docker)
if os.environ.get("DB_HOST") == "db" or not os.environ.get("DB_HOST"):
    os.environ["DB_HOST"] = "localhost"

from app.database import AsyncSessionLocal
from app.models.herramientas_informaticas.maestro import HerramientaInformatica
from sqlalchemy import delete

async def seed():
    # Cargar datos desde JSON
    json_path = os.path.join(os.path.dirname(__file__), "..", "app", "resources", "herramientas_data.json")
    if not os.path.exists(json_path):
        print(f"Error: No se encontró el archivo JSON en {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        herramientas_data = json.load(f)

    async with AsyncSessionLocal() as session:
        try:
            # Limpiar tabla para evitar duplicados en este seeding masivo
            await session.execute(delete(HerramientaInformatica))
            
            for item in herramientas_data:
                # El modelo usa 'funcionalidad', el JSON también
                herramienta = HerramientaInformatica(**item)
                session.add(herramienta)
            
            await session.commit()
            print(f"Se han insertado {len(herramientas_data)} herramientas con éxito.")
        except Exception as e:
            await session.rollback()
            print(f"Error al insertar herramientas: {e}")

if __name__ == "__main__":
    asyncio.run(seed())
