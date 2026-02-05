from sqlalchemy import create_engine, text

DBS = [
    "postgresql://postgres:AdminSolid2025@192.168.0.21:5432/solidpruebas3",
    "postgresql://postgres:AdminSolid2025@192.168.0.21:5432/solid",
    "postgresql://user:password@localhost:5432/project_manager"
]

def find_table():
    for db_url in DBS:
        try:
            engine = create_engine(db_url)
            with engine.connect() as conn:
                print(f"Buscando en: {db_url.split('/')[-1]}...")
                res = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'legalizaciones_transito'")).first()
                if res:
                    print(f"¡ENCONTRADA! La tabla está en {db_url}")
                    # Check columns
                    cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'legalizaciones_transito'")).all()
                    print(f"Columnas: {[c[0] for c in cols]}")
                else:
                    print("No encontrada.")
        except Exception as e:
            print(f"Error conectando a {db_url}: {e}")

if __name__ == "__main__":
    find_table()
