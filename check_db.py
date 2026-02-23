
import os
import sys
from sqlalchemy import create_engine, text

# Forzar encoding a utf-8 para la salida
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/gpt_proyectos"

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("--- REPORTE WEB-L0001 ---")
        query = text("SELECT reporte_id, estado, nombreempleado FROM legalizaciones_transito WHERE reporte_id = 'WEB-L0001'")
        res = conn.execute(query).fetchone()
        print(f"Resultado: {res}")
        
        print("\n--- ULTIMOS 10 REPORTES ---")
        query10 = text("SELECT reporte_id, estado, nombreempleado, codigo FROM legalizaciones_transito ORDER BY codigo DESC LIMIT 10")
        res10 = conn.execute(query10).fetchall()
        for r in res10:
            print(f"ID: {r[0]}, Estado: {r[1]}, Empleado: {r[2]}, Codigo: {r[3]}")
            
        print("\n--- VALOR ACTUAL DE SECUENCIAS ---")
        try:
            # Intentar obtener el valor de la secuencia directamente si existe
            seqs = ["transito_viaticos_codigo_seq", "legalizaciones_transito_codigo_seq"]
            for s in seqs:
                try:
                    val = conn.execute(text(f"SELECT last_value FROM {s}")).scalar()
                    print(f"Secuencia {s}: {val}")
                except Exception as e_seq:
                    print(f"No se pudo leer last_value de {s}: {e_seq}")
            
            max1 = conn.execute(text("SELECT MAX(codigo) FROM transito_viaticos")).scalar()
            max2 = conn.execute(text("SELECT MAX(codigo) FROM legalizaciones_transito")).scalar()
            print(f"Max transito_viaticos: {max1}")
            print(f"Max legalizaciones_transito: {max2}")
        except Exception as e:
            print(f"Error checking sequences: {e}")

except Exception as e:
    print(f"Error: {e}")
