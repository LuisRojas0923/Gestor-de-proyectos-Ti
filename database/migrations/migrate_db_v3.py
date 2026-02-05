import sys
import os

# Añadir el path del proyecto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend_v2')))

try:
    from app.database import sync_engine
    from sqlalchemy import text
    
    # Intentar ejecutar la migración sin capturar el error como string UTF-8 directamente
    with sync_engine.connect() as conn:
        print("MIGRATION_ATTEMPT_START")
        conn.execute(text("ALTER TABLE transito_viaticos ALTER COLUMN reporte_id TYPE VARCHAR(50) USING reporte_id::VARCHAR"))
        conn.commit()
        print("MIGRATION_SUCCESS")
except Exception as e:
    # Capturar el error de forma segura
    try:
        error_msg = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"MIGRATION_ERROR_SAFE: {error_msg}")
    except:
        print("MIGRATION_ERROR_CRITICAL_UNKNOWN")
