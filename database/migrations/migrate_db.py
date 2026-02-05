import psycopg2

def migrate():
    try:
        conn = psycopg2.connect("dbname=gestion_proyectos user=postgres password=postgres host=localhost")
        cur = conn.cursor()
        
        print("--- Iniciando migración de reporte_id ---")
        # Cambiar el tipo de columna a VARCHAR(50). UUID se puede castear a TEXT directamente.
        cur.execute("""
            ALTER TABLE transito_viaticos 
            ALTER COLUMN reporte_id TYPE VARCHAR(50) USING reporte_id::VARCHAR;
        """)
        
        conn.commit()
        print("MIGRATION_SUCCESS: El tipo de columna reporte_id ha sido cambiado a VARCHAR(50).")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"MIGRATION_ERROR: {e}")

if __name__ == "__main__":
    migrate()
