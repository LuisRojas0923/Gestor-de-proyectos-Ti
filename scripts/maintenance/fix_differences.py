import asyncio
from sqlalchemy import text
from backend_v2.app.database import async_engine

async def fix_inventory_differences():
    try:
        async with async_engine.begin() as conn:
            print("Corrigiendo diferencias globales iniciales...")
            # Establecer diferencia_total = -cantidad_final para items no contados
            # Solo para registros donde no hay conteos en ninguna ronda
            await conn.execute(text("""
                UPDATE conteoinventario 
                SET diferencia_total = -(COALESCE(cantidad_sistema, 0) + COALESCE(invporlegalizar, 0))
                WHERE cant_c1 IS NULL AND cant_c2 IS NULL AND cant_c3 IS NULL AND cant_c4 IS NULL;
            """))
            
            # También asegurar que cantidad_final esté poblado
            await conn.execute(text("""
                UPDATE conteoinventario 
                SET cantidad_final = (COALESCE(cantidad_sistema, 0) + COALESCE(invporlegalizar, 0))
                WHERE cantidad_final = 0 AND (cantidad_sistema != 0 OR invporlegalizar != 0);
            """))
            
            print("Corrección completada.")
    except Exception as e:
        print(f"Error durante la corrección de diferencias: {e}")
        # En begin(), el rollback es automático al lanzarse la excepción.

if __name__ == "__main__":
    asyncio.run(fix_inventory_differences())
