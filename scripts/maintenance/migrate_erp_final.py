
import os
import sys
from sqlalchemy import create_engine, text

# Cambiar al directorio raíz del proyecto para asegurar que .env se cargue bien
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
sys.path.append(os.getcwd() + "/backend_v2")

from app.config import config

def migrate_erp():
    try:
        print(f"DEBUG: Conectando a ERP en {config.erp_database_url}")
        engine = create_engine(config.erp_database_url)
        
        with engine.connect() as conn:
            # 1. Verificar si existe la tabla
            check_table = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'establecimiento')")).scalar()
            if not check_table:
                print("ERROR: La tabla 'establecimiento' no existe en esta base de datos.")
                return

            # 2. Añadir columna si no existe
            print("Añadiendo columna 'correo_sincronizado'...")
            # PostgreSQL syntax para añadir columna si no existe
            conn.execute(text("ALTER TABLE establecimiento ADD COLUMN IF NOT EXISTS correo_sincronizado BOOLEAN DEFAULT FALSE"))
            # Forzar actualización de existentes a FALSE si es necesario (DEFAULT lo hace)
            conn.commit()
            print("MIGRACIÓN EXITOSA: Columna 'correo_sincronizado' añadida a 'establecimiento'.")
    except Exception as e:
        print(f"ERROR DURANTE MIGRACIÓN: {e}")
        raise

if __name__ == "__main__":
    migrate_erp()
