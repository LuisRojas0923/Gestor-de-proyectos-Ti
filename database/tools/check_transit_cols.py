import os
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

def check_details():
    try:
        engine = create_engine(ERP_URL)
        with engine.connect() as conn:
            print(f"Auditoría de columnas en transito_viaticos (ERP)...")
            cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'transito_viaticos'")).all()
            if cols:
                print(f"Columnas encontradas: {[c[0] for c in cols]}")
            else:
                print("¡ALERTA! La tabla transito_viaticos NO EXISTE en el ERP.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_details()
