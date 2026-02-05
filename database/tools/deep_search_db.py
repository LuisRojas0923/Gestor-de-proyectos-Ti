from sqlalchemy import create_engine, text

ERP_URL = "postgresql://postgres:AdminSolid2025@192.168.0.21:5432/solidpruebas3"

def deep_search():
    try:
        engine = create_engine(ERP_URL)
        with engine.connect() as conn:
            print(f"Buscando 'legalizaciones_transito' en TODOS LOS ESQUEMAS de solidpruebas3...")
            res = conn.execute(text("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name = 'legalizaciones_transito'
            """)).all()
            
            if res:
                for schema, name in res:
                    print(f"¡ENCONTRADA! Esquema: {schema}, Tabla: {name}")
                    cols = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{name}' AND table_schema = '{schema}'")).all()
                    print(f"Columnas: {[c[0] for c in cols]}")
            else:
                print("No se encontró la tabla en ningún esquema de solidpruebas3.")
                
                # Listar algunas tablas para ver si estamos en la DB correcta
                print("\nTablas disponibles en public:")
                tables = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' LIMIT 20")).all()
                print([t[0] for t in tables])
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    deep_search()
