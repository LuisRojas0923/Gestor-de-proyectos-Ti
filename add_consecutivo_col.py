import psycopg2

def add_col():
    try:
        conn = psycopg2.connect("dbname=gestion_proyectos user=postgres password=postgres host=localhost")
        conn.set_client_encoding('latin1')
        cur = conn.cursor()
        print("COL_ADD_START")
        cur.execute("ALTER TABLE transito_viaticos ADD COLUMN IF NOT EXISTS consecutivo VARCHAR(50)")
        conn.commit()
        print("COL_ADD_SUCCESS")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"COL_ADD_ERROR: {ascii(str(e))}")

if __name__ == "__main__":
    add_col()
