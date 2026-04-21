
import os
import sys
from sqlalchemy import create_engine, text

# Add backend to path to import config
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend_v2'))
from app.config import config

def manage_erp():
    print(f"Connecting to ERP: {config.erp_database_url}")
    engine = create_engine(config.erp_database_url)
    
    try:
        with engine.connect() as conn:
            # Check columns
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'establecimiento'"))
            columns = [row[0] for row in result]
            print(f"Current columns in 'establecimiento': {columns}")
            
            if 'correo_sincronizado' not in columns:
                print("Adding column 'correo_sincronizado' to 'establecimiento'...")
                conn.execute(text("ALTER TABLE establecimiento ADD COLUMN correo_sincronizado BOOLEAN DEFAULT FALSE"))
                print("Column added successfully.")
            else:
                print("Column 'correo_sincronizado' already exists.")
    except Exception as e:
        print(f"Error en la conexión o ejecución de BD: {e}")
        raise

if __name__ == "__main__":
    try:
        manage_erp()
    except Exception as e:
        print(f"Error: {e}")
