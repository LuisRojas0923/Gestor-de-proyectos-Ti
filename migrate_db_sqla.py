from sqlalchemy import text
import sys
import os

# Añadir el path del proyecto para importar app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend_v2')))

try:
    from app.database import sync_engine
    
    with sync_engine.connect() as conn:
        print("--- Iniciando migración de reporte_id con SQLAlchemy ---")
        conn.execute(text("""
            ALTER TABLE transito_viaticos 
            ALTER COLUMN reporte_id TYPE VARCHAR(50) USING reporte_id::VARCHAR;
        """))
        conn.commit()
        print("MIGRATION_SUCCESS: El tipo de columna reporte_id ahora es VARCHAR(50).")
except Exception as e:
    print(f"MIGRATION_ERROR: {str(e)}")
