import asyncio
from sqlalchemy import text
from backend_v2.app.database import async_engine

async def check_items(codes):
    try:
        async with async_engine.connect() as conn:
            print(f"Buscando ítems: {codes}")
            res = await conn.execute(text("""
                SELECT id, codigo, cantidad_sistema, cant_c1, cant_c2, diferencia_total, estado 
                FROM conteoinventario 
                WHERE codigo IN :codes
            """), {"codes": tuple(codes)})
            
            for row in res.mappings():
                print(row)
    except Exception as e:
        print(f"Error al consultar ítems: {e}")

if __name__ == "__main__":
    asyncio.run(check_items(['3-68-22', '3-45-55']))
