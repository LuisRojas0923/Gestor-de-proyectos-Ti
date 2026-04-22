import asyncio
import os
import sys

# Añadir el directorio raíz al path para poder importar la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import async_engine

async def fix_tickets():
    print("Iniciando limpieza de datos de tickets...")
    
    queries = [
        # 1. Asegurar que exista una categoría por defecto si no hay
        "INSERT INTO categorias_ticket (id, nombre, tipo_formulario) VALUES ('soporte_general', 'Soporte General', 'basico') ON CONFLICT (id) DO NOTHING;",
        
        # 2. Corregir categoria_id nulos
        "UPDATE tickets SET categoria_id = 'soporte_general' WHERE categoria_id IS NULL;",
        
        # 3. Corregir asuntos nulos
        "UPDATE tickets SET asunto = 'Sin asunto' WHERE asunto IS NULL OR asunto = '';",
        
        # 4. Corregir descripciones nulas
        "UPDATE tickets SET descripcion = 'Sin descripción' WHERE descripcion IS NULL OR descripcion = '';",
        
        # 5. Corregir creador_id nulos (si existieran, aunque el modelo es estricto)
        "UPDATE tickets SET creador_id = 'sistema' WHERE creador_id IS NULL;"
    ]
    
    try:
        async with async_engine.begin() as conn:
            for query in queries:
                result = await conn.execute(text(query))
                print(f"Ejecutado: {query} -> Filas afectadas: {result.rowcount}")
        
        print("Limpieza completada exitosamente.")
    except Exception as e:
        print(f"ERROR durante la limpieza: {e}")

if __name__ == "__main__":
    asyncio.run(fix_tickets())
