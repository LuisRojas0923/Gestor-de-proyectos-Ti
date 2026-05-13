
import asyncio
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Intentar usar las credenciales del .env
DB_USER = os.getenv("DB_USER", "user")
DB_PASS = os.getenv("DB_PASSWORD", "password_segura_refridcol")
DB_HOST = "localhost" # Asumiendo localhost para ejecución directa
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "project_manager")

engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

def clear_hdi_data():
    try:
        with engine.connect() as conn:
            # Eliminar registros normalizados
            res1 = conn.execute(text("DELETE FROM nomina_registros_normalizados WHERE subcategoria_final = 'SEGUROS HDI'"))
            # Eliminar archivos asociados
            res2 = conn.execute(text("DELETE FROM nomina_archivos WHERE subcategoria = 'SEGUROS HDI'"))
            conn.commit()
            print(f"Cleanup successful. Deleted {res1.rowcount} records and {res2.rowcount} files.")
    except Exception as e:
        print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    clear_hdi_data()
