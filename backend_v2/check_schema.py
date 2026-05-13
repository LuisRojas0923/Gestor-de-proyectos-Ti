
import asyncio
from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(r'c:\Users\amejoramiento3\Desktop\DESCUENTOS_NOMINA_REFRIDCOL_SOLID\Gestor-de-proyectos-Ti\backend_v2')
from app.config import config

async def check_schema():
    # Usando la URL del ERP si está disponible, o la local
    # Para propósitos de este test, usaré la local ya que a veces el ERP es local en este entorno
    url = config.erp_database_url
    engine = create_engine(url)
    with engine.connect() as conn:
        print("--- Table: establecimiento ---")
        try:
            res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'establecimiento';"))
            for row in res:
                print(f"Col: {row.column_name}, Type: {row.data_type}")
            
            print("\n--- Indexes: establecimiento ---")
            res = conn.execute(text("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'establecimiento';"))
            for row in res:
                print(f"Index: {row.indexname}")
        except Exception as e:
            print(f"Error checking establecimiento: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
