import asyncio
from sqlalchemy import text
from backend_v2.app.database import async_engine

async def check_global_stats():
    try:
        async with async_engine.connect() as conn:
            print("--- GLOBAL STATISTICS CHECK ---")
            
            # 1. Total items
            res_total = await conn.execute(text("SELECT COUNT(*) FROM conteoinventario"))
            total = res_total.scalar()
            print(f"Total Items: {total}")
            
            # 2. Conciliados
            res_conciliados = await conn.execute(text("SELECT COUNT(*) FROM conteoinventario WHERE estado = 'CONCILIADO'"))
            conciliados = res_conciliados.scalar()
            print(f"Conciliados: {conciliados}")
            
            # 3. Pendientes (Original logic)
            res_pendientes = await conn.execute(text("""
                SELECT COUNT(*) FROM conteoinventario 
                WHERE user_c1 IS NULL AND estado = 'PENDIENTE'
            """))
            pendientes = res_pendientes.scalar()
            print(f"Pendientes (Untouched): {pendientes}")
            
            # 4. Processed (Total - Pendientes)
            processed = total - pendientes
            print(f"Processed (Total - Pendientes): {processed}")
            
            if total > 0:
                print(f"Effectiveness%: {round(conciliados/total*100, 2)}%")
                print(f"Progress%: {round(processed/total*100, 2)}%")
    except Exception as e:
        print(f"Error al obtener estadísticas globales: {e}")

if __name__ == "__main__":
    asyncio.run(check_global_stats())
