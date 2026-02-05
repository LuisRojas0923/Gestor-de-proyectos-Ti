from sqlalchemy import text
import sys
import os

# Añadir el path del proyecto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend_v2')))

try:
    from app.database import sync_engine
    
    with sync_engine.connect() as conn:
        print("FORCED_MIGRATION_START")
        # 1. Intentar cambiar el tipo directamente con casting a TEXT primero
        # 2. Si falla, podríamos considerar crear una columna temporal, pero probaremos esto primero
        conn.execute(text("""
            ALTER TABLE transito_viaticos 
            ALTER COLUMN reporte_id TYPE VARCHAR(50) USING reporte_id::TEXT;
        """))
        conn.commit()
        print("MIGRATION_SUCCESS")
except Exception as e:
    print(f"MIGRATION_ERROR: {str(e).encode('ascii', 'replace').decode('ascii')}")
