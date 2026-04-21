import asyncio
import sys
import os
from sqlalchemy import text

# Añadir el directorio backend_v2 al path para poder importar la app
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend_v2'))

from app.database import erp_engine

async def inspect_erp():
    try:
        with erp_engine.connect() as conn:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'establecimiento'"))
            columns = [row[0] for row in result]
            print(f"Columns in establecimiento: {columns}")
    except Exception as e:
        print(f"Error en inspect_erp: {e}")
        raise

if __name__ == "__main__":
    try:
        with erp_engine.connect() as conn:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'establecimiento'"))
            columns = [row[0] for row in result]
            print(f"Columns in establecimiento: {columns}")
    except Exception as e:
        print(f"Error inspeccionando ERP: {e}")
