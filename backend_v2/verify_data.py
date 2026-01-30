import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Agregar el directorio actual al path para poder importar si fuera necesario (aunque aquí usaremos SQL directo)
sys.path.append(os.getcwd())

# URL de conexión (asumiendo defaults de config.py ya que .env no tiene DATABASE_URL)
# Usando pg8000 para evitar errores de encoding de psycopg2 en Windows
DATABASE_URL = "postgresql+pg8000://user:password@localhost:5432/project_manager"

def verify_data():
    print(f"Connecting to database: {DATABASE_URL}")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            print("Connection successful!")
            
                print(f"\nFound {len(rows)} records in 'transito_viaticos':")
                for row in rows:
                    print(row)
                
            except Exception as e:
                print(f"Error querying table: {e}")

    except OperationalError as e:
        print(f"Connection failed. Please check if the database is running and accessible on localhost:5432.\nError: {e}")

if __name__ == "__main__":
    verify_data()
