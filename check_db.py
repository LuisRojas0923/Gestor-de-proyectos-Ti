import asyncio
from sqlalchemy import text
from backend_v2.app.database import async_engine

async def check_some_items(codes):
    try:
        async with async_engine.connect() as conn:
            print(f"Buscando ítems: {codes}")
            res = await conn.execute(text("""
                SELECT id, codigo, cantidad_sistema, cant_c1, cant_c2, cant_c3, cant_c4, diferencia_total, estado 
                FROM conteoinventario 
                WHERE codigo IN :codes
            """), {"codes": tuple(codes)})
            
            for row in res.mappings():
                print(f"ID: {row['id']} Code: {row['codigo']} Sist: {row['cantidad_sistema']} c1: {row['cant_c1']} c2: {row['cant_c2']} DIF: {row['diferencia_total']} State: {row['estado']}")
    except Exception as e:
        print(f"Error al consultar la base de datos: {e}")

if __name__ == "__main__":
    test_codes = ['5-5-188', '7-2-1039', '7-2-1173']
    asyncio.run(check_some_items(test_codes))
