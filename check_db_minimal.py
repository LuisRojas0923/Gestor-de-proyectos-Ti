
import os
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/gpt_proyectos"

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("CHECK_START")
        query = text("SELECT reporte_id, estado FROM legalizaciones_transito WHERE reporte_id = 'WEB-L0001'")
        res = conn.execute(query).fetchone()
        if res:
            print(f"WEB-L0001_STATUS: {res[1]}")
        else:
            print("WEB-L0001_NOT_FOUND")
            
        max1 = conn.execute(text("SELECT MAX(codigo) FROM transito_viaticos")).scalar()
        max2 = conn.execute(text("SELECT MAX(codigo) FROM legalizaciones_transito")).scalar()
        print(f"MAX_TV: {max1}")
        print(f"MAX_LT: {max2}")
        
        # Check sequence values if possible
        try:
            val1 = conn.execute(text("SELECT last_value FROM transito_viaticos_codigo_seq")).scalar()
            print(f"SEQ_TV: {val1}")
        except: pass
        try:
            val2 = conn.execute(text("SELECT last_value FROM legalizaciones_transito_codigo_seq")).scalar()
            print(f"SEQ_LT: {val2}")
        except: pass
        print("CHECK_END")

except Exception as e:
    print(f"ERROR: {str(e)}")
