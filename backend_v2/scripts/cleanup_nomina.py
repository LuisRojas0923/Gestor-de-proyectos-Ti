
import asyncio
import sys
import os

# Añadir el directorio raíz al path para importar app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import AsyncSessionLocal

async def cleanup_nomina():
    print("--- INICIANDO LIMPIEZA DE NOVEDADES DE NÓMINA ---")
    
    async with AsyncSessionLocal() as session:
        try:
            # 1. Eliminar excepciones e historial
            print("Limpiando excepciones e historial...")
            await session.execute(text("DELETE FROM nomina_excepciones_historial"))
            await session.execute(text("DELETE FROM nomina_excepciones"))
            
            # 2. Eliminar registros crudos y normalizados (sería redundante por el cascade de nomina_archivos, pero aseguramos)
            print("Limpiando registros de nómina...")
            await session.execute(text("DELETE FROM nomina_registros_crudos"))
            await session.execute(text("DELETE FROM nomina_registros_normalizados"))
            
            # 3. Eliminar archivos de nómina
            print("Limpiando archivos cargados...")
            await session.execute(text("DELETE FROM nomina_archivos"))
            
            await session.commit()
            print("\nLIMPIEZA COMPLETADA EXITOSAMENTE")
            print("- nomina_excepciones_historial: VACIO")
            print("- nomina_excepciones: VACIO")
            print("- nomina_registros_crudos: VACIO")
            print("- nomina_registros_normalizados: VACIO")
            print("- nomina_archivos: VACIO")
            
        except Exception as e:
            await session.rollback()
            print(f"\nERROR DURANTE LA LIMPIEZA: {e}")
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(cleanup_nomina())
