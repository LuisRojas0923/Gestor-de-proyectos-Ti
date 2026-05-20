import psycopg2

def migrate():
    try:
        conn = psycopg2.connect(
            "dbname=gestion_proyectos user=postgres password=postgres host=localhost"
        )
        cur = conn.cursor()

        print("MIGRATION_START: Añadiendo columna supervisor a desarrollos")

        cur.execute("""
            ALTER TABLE desarrollos
            ADD COLUMN IF NOT EXISTS supervisor VARCHAR(255)
        """)

        conn.commit()
        print("MIGRATION_SUCCESS")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"MIGRATION_ERROR: {ascii(str(e))}")

if __name__ == "__main__":
    migrate()
