
import sys
import os
from dotenv import load_dotenv

# Añadir el directorio raíz al path para importar app
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Cargar variables de entorno desde el .env del root o del backend_v2
load_dotenv(os.path.join(BASE_DIR, ".env"))

from app.database import sync_engine
from sqlalchemy import text

def reset_database():
    print("Iniciando limpieza de base de datos...")
    queries = [
        "TRUNCATE TABLE facturas_lineas RESTART IDENTITY CASCADE;",
        "TRUNCATE TABLE lineas_corporativas RESTART IDENTITY CASCADE;",
        "TRUNCATE TABLE empleados_lineas RESTART IDENTITY CASCADE;",
        "TRUNCATE TABLE equipos_moviles RESTART IDENTITY CASCADE;"
    ]
    
    try:
        with sync_engine.connect() as conn:
            for query in queries:
                print(f"Ejecutando: {query}")
                conn.execute(text(query))
            conn.commit()
        print("Limpieza completada con éxito.")
    except Exception as e:
        print(f"Error durante la limpieza: {e}")
        sys.exit(1)

if __name__ == "__main__":
    reset_database()
