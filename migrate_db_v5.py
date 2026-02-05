from sqlalchemy import text
import sys
import os

# Añadir el path del proyecto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend_v2')))

try:
    from app.database import sync_engine
    
    # Intentar forzar la codificación en la conexión
    with sync_engine.connect() as conn:
        print("ENCODING_CLEANUP_START")
        # Cambiar el tipo de columna usando cast a TEXT, que es más flexible que VARCHAR direto desde UUID en algunos drivers
        # Además, nos aseguramos de que la sesión use UTF8
        conn.execute(text("SET client_encoding TO 'UTF8';"))
        conn.execute(text("""
            ALTER TABLE transito_viaticos 
            ALTER COLUMN reporte_id TYPE VARCHAR(50) USING reporte_id::TEXT;
        """))
        conn.commit()
        print("MIGRATION_SUCCESS")
except Exception as e:
    # Capturar el error y sanitizarlo para la consola
    msg = str(e).encode('ascii', 'replace').decode('ascii')
    print(f"MIGRATION_ERROR: {msg}")
