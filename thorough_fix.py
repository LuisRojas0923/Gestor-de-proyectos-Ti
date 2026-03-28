import asyncio
from sqlalchemy import text
from backend_v2.app.database import async_engine
from backend_v2.app.config import config

async def thorough_fix():
    print(f"Usando URL: {config.database_url}")
    async with async_engine.begin() as conn:
        # 1. Asegurar cantidad_final esté bien
        print("Sincronizando cantidad_final...")
        await conn.execute(text("""
            UPDATE conteoinventario 
            SET cantidad_final = (COALESCE(cantidad_sistema, 0) + COALESCE(invporlegalizar, 0))
        """))
        
        # 2. Reiniciar estados y diferencias para los que NO tienen NINGUN conteo en ninguna ronda
        # Consideramos 0.0 o NULL como 'no contado' si no hay usuario asignado o fecha de conteo.
        # Pero más simple: si las 4 columnas de cantidad son NULL o 0, y el estado es 'CONCILIADO' pero el teórico > 0, es un error.
        print("Corrigiendo falsos conciliados...")
        await conn.execute(text("""
            UPDATE conteoinventario 
            SET diferencia_total = -cantidad_final,
                estado = 'PENDIENTE'
            WHERE (cant_c1 IS NULL OR cant_c1 = 0) 
              AND (cant_c2 IS NULL OR cant_c2 = 0)
              AND (cant_c3 IS NULL OR cant_c3 = 0)
              AND (cant_c4 IS NULL OR cant_c4 = 0)
              AND cantidad_final > 0;
        """))
        
        print("Proceso terminado.")

if __name__ == "__main__":
    asyncio.run(thorough_fix())
