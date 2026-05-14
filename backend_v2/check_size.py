
import asyncio
from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\backend_v2')
from app.config import config

async def check_table_size():
    url = config.database_url.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(url)
    with engine.connect() as conn:
        try:
            res = conn.execute(text("SELECT count(*) FROM nomina_registros_normalizados;"))
        except Exception:
            pass
        count = res.scalar()
        print(f"Total rows in NominaRegistrosNormalizados: {count}")
        
        try:
            res = conn.execute(text("SELECT subcategoria_final, count(*) FROM nomina_registros_normalizados GROUP BY subcategoria_final;"))
        except Exception:
            pass
        for row in res:
            print(f"Subcat: {row[0]}, Count: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_table_size())