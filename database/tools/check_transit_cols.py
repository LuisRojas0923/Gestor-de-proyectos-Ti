from sqlalchemy import create_engine, text

ERP_URL = "postgresql://postgres:AdminSolid2025@192.168.0.21:5432/solidpruebas3"

def check_details():
    try:
        engine = create_engine(ERP_URL)
        with engine.connect() as conn:
            print(f"Auditoría de columnas en transito_viaticos (ERP)...")
            cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'transito_viaticos'")).all()
            if cols:
                print(f"Columnas encontradas: {[c[0] for c in cols]}")
            else:
                print("¡ALERTA! La tabla transito_viaticos NO EXISTE en el ERP.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_details()
