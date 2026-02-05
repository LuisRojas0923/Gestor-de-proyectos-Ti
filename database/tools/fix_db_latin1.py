import psycopg2

def fix():
    try:
        # Intentar conectar con una codificación que acepte el byte 0xf3 (ó en latin-1)
        conn = psycopg2.connect(
            "dbname=gestion_proyectos user=postgres password=postgres host=localhost",
            client_encoding='latin1'
        )
        cur = conn.cursor()
        print("LATIN1_CONNECTION_SUCCESS")
        
        # Ejecutar la migración
        cur.execute("ALTER TABLE transito_viaticos ALTER COLUMN reporte_id TYPE VARCHAR(50) USING reporte_id::TEXT")
        conn.commit()
        print("MIGRATION_SUCCESS")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    fix()
