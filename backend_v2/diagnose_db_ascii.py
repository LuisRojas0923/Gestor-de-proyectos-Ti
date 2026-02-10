import sqlalchemy
from sqlalchemy import text
from app.config import config

def diagnose():
    try:
        url = config.erp_database_url
        engine = sqlalchemy.create_engine(url)
        with engine.connect() as conn:
            for table in ['legalizaciones_transito', 'transito_viaticos']:
                print(f"\n--- Columns for {table} ---")
                # Usar consulta cruda a pg_attribute para evitar problemas con information_schema si los hay
                sql = text(f"""
                    SELECT a.attname 
                    FROM pg_attribute a 
                    JOIN pg_class t ON a.attrelid = t.oid 
                    JOIN pg_namespace n ON t.relnamespace = n.oid 
                    WHERE t.relname = '{table}' 
                    AND a.attnum > 0 
                    AND NOT a.attisdropped
                """)
                res = conn.execute(sql)
                cols = [row[0] for row in res.fetchall()]
                for c in cols:
                    # Imprimir repr() para ver los bytes exactos si hay algo raro
                    print(f"  {repr(c)}")
    except Exception as e:
        print(f"Error: {repr(e)}")

if __name__ == '__main__':
    diagnose()
