import sqlalchemy
from app.config import config
import sys

def list_schema():
    try:
        url = config.erp_database_url
        engine = sqlalchemy.create_engine(url)
        inspector = sqlalchemy.inspect(engine)
        
        tables = inspector.get_table_names()
        critical_tables = ['transito_viaticos', 'legalizaciones_transito']
        
        for table_name in critical_tables:
            matches = [t for t in tables if t.lower() == table_name.lower()]
            if matches:
                real_name = matches[0]
                print(f"\nTable '{real_name}' EXISTS.")
                columns = inspector.get_columns(real_name)
                for col in columns:
                    print(f"  - {col['name']} ({col['type']})")
            else:
                print(f"\nTable '{table_name}' DOES NOT exist.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    list_schema()
