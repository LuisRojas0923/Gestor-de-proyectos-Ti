
import sys
import os

# Añadir el directorio actual al path para importar app
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.database import SessionLocal

def cleanup_db():
    print("Iniciando limpieza de tablas de nómina...")
    
    tables = [
        "nomina_excepciones_historial",
        "nomina_excepciones",
        "nomina_registros_normalizados",
        "nomina_registros_crudos",
        "nomina_archivos"
    ]
    
    db = SessionLocal()
    try:
        for table in tables:
            print(f"Limpiando tabla: {table}")
            # Usamos TRUNCATE con CASCADE para manejar las llaves foráneas
            db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))
        
        db.commit()
        print("¡Limpieza completada con éxito!")
    except Exception as e:
        db.rollback()
        print(f"Error durante la limpieza: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_db()
