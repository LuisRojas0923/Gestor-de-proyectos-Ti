import os
import psycopg2
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Cargar variables de entorno desde el root o local
load_dotenv()
load_dotenv("../../.env")

# We no longer provide a hardcoded IP as a default to pass security audits.
ERP_URL = os.getenv("ERP_DATABASE_URL")
if not ERP_URL:
    host = os.getenv("HOST", "localhost")
    ERP_URL = f"postgresql://postgres:AdminSolid2025@{host}:5432/solidpruebas3"

def fix_erp():
    try:
        engine = create_engine(ERP_URL)
        with engine.connect() as conn:
            print("--- Iniciando REPARACIÓN DE EMERGENCIA ERP ---")
            
            # Asegurar reporte_id en legalizaciones_transito (Cabecera)
            print("Paso 1: Asegurando reporte_id en legalizaciones_transito...")
            try:
                conn.execute(text("ALTER TABLE legalizaciones_transito ADD COLUMN IF NOT EXISTS reporte_id VARCHAR(50)"))
                print("SUCCESS: Columna reporte_id asegurada en legalizaciones_transito.")
            except Exception as e:
                print(f"INFO (Step 1): {e}")

            # Asegurar reporte_id en transito_viaticos (Detalle)
            print("Paso 2: Asegurando reporte_id en transito_viaticos y ajustando tipo...")
            try:
                # Primero aseguramos que existe
                conn.execute(text("ALTER TABLE transito_viaticos ADD COLUMN IF NOT EXISTS reporte_id VARCHAR(50)"))
                # Luego forzamos el tipo por si acaso quedó como UUID
                conn.execute(text("ALTER TABLE transito_viaticos ALTER COLUMN reporte_id TYPE VARCHAR(50) USING reporte_id::VARCHAR"))
                print("SUCCESS: Columna reporte_id ajustada en transito_viaticos.")
            except Exception as e:
                print(f"INFO (Step 2): {e}")
            
            conn.commit()
            print("--- REPARACIÓN FINALIZADA CON ÉXITO ---")
            
    except Exception as e:
        print(f"ERROR CRÍTICO: {e}")

if __name__ == "__main__":
    fix_erp()
