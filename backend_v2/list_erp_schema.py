import sqlalchemy
from app.config import config
import sys

def list_schema():
    try:
        url = config.erp_database_url
        # Usar client_encoding=utf8 para evitar errores de decodificación
        engine = sqlalchemy.create_engine(url, connect_args={"options": "-c client_encoding=utf8"})
        inspector = sqlalchemy.inspect(engine)
        inspector = sqlalchemy.inspect(engine)
        
        tables = inspector.get_table_names()
        tables = inspector.get_table_names()
        if 'transito_viaticos' in [t.lower() for t in tables]:
            print("Table 'transito_viaticos' EXISTS in ERP.")
            columns = inspector.get_columns('transito_viaticos')
            print(f"Columns: {[c['name'] for c in columns]}")
        else:
            print("Table 'transito_viaticos' DOES NOT exist in ERP.")
            print(f"Other tables: {[t for t in tables if 'trans' in t.lower() or 'viatic' in t.lower()]}")
        # Ver ejemplos de usuario y codigolegalizacion
        with engine.connect() as conn:
            res = conn.execute(sqlalchemy.text("SELECT codigolegalizacion, usuario, empleado FROM legalizacion ORDER BY codigo DESC LIMIT 5"))
            rows = res.fetchall()
            for r in rows:
                print(f"Radicado: {r[0]}, Usuario ID: {r[1]}, Empleado: {r[2]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    list_schema()
