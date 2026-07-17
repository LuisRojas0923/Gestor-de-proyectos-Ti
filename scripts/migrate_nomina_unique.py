import asyncio
import os
import sys

# Ajustar el sys.path para poder importar modulos de la app
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend_v2.app.database import async_engine

async def migrate():
    print("Iniciando migración de base de datos para constraint UNIQUE en NominaExcepcionHistorial...")
    try:
        async with async_engine.begin() as conn:
            # Primero eliminamos duplicados en caso de que existan antes de aplicar el constraint
            # Nos quedamos con el de ID mayor
            print("Limpiando duplicados...")
            await conn.execute(text("""
                DELETE FROM nomina_excepciones_historial a USING (
                    SELECT MAX(id) as id, excepcion_id, mes, anio
                    FROM nomina_excepciones_historial 
                    GROUP BY excepcion_id, mes, anio HAVING COUNT(*) > 1
                ) b
                WHERE a.excepcion_id = b.excepcion_id 
                AND a.mes = b.mes 
                AND a.anio = b.anio 
                AND a.id <> b.id
            """))

            # Intentamos borrar el constraint si ya existe para evitar errores
            try:
                await conn.execute(text("ALTER TABLE nomina_excepciones_historial DROP CONSTRAINT IF EXISTS uq_excepcion_historial_periodo"))
            except Exception as e:
                print("Nota: Constraint no existía o no se pudo borrar (esperado si es primera vez):", e)

            print("Aplicando constraint UNIQUE...")
            await conn.execute(text("""
                ALTER TABLE nomina_excepciones_historial 
                ADD CONSTRAINT uq_excepcion_historial_periodo UNIQUE (excepcion_id, mes, anio)
            """))
            print("Migración completada exitosamente.")
    except Exception as e:
        print(f"Error durante la migración: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(migrate())
