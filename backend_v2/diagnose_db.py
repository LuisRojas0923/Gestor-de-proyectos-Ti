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
                res = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"))
                cols = [row[0] for row in res.fetchall()]
                for c in cols:
                    print(f"  {c}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    diagnose()
