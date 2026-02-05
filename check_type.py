import psycopg2

def get_type():
    try:
        conn = psycopg2.connect("dbname=gestion_proyectos user=postgres password=postgres host=localhost")
        cur = conn.cursor()
        cur.execute("SELECT typname FROM pg_type WHERE oid = (SELECT atttypid FROM pg_attribute WHERE attrelid = 'transito_viaticos'::regclass AND attname = 'reporte_id')")
        res = cur.fetchone()
        if res:
            print(f"TYPE_FOUND: {res[0]}")
        else:
            print("TYPE_NOT_FOUND")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ERROR_IN_SCRIPT")

if __name__ == "__main__":
    get_type()
