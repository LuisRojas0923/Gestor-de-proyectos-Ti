import sqlalchemy
from sqlalchemy import text
from app.config import config

def test_columns():
    url = config.erp_database_url
    engine = sqlalchemy.create_engine(url)
    
    with engine.connect() as conn:
        print("Testing transito_viaticos columns...")
        for col in ['valorconfactura', 'valor_con_factura']:
            try:
                conn.execute(text(f"SELECT {col} FROM transito_viaticos LIMIT 1"))
                print(f"SUCCESS: Column {col} EXISTS.")
            except Exception as e:
                print(f"FAILED: Column {col} DOES NOT exist or error.")
        
        print("\nTesting legalizaciones_transito columns...")
        for col in ['codigolegalizacion', 'codigo_legalizacion']:
            try:
                conn.execute(text(f"SELECT {col} FROM legalizaciones_transito LIMIT 1"))
                print(f"SUCCESS: Column {col} EXISTS.")
            except Exception as e:
                print(f"FAILED: Column {col} DOES NOT exist or error.")

if __name__ == '__main__':
    test_columns()
