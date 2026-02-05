import psycopg2

def check_schema():
    try:
        conn = psycopg2.connect("dbname=gestion_proyectos user=postgres password=postgres host=localhost")
        cur = conn.cursor()
        
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'transito_viaticos'
            ORDER BY ordinal_position;
        """)
        rows = cur.fetchall()
        print("COLUMNS_START")
        for row in rows:
            # Usamos ascii() para evitar problemas de codificación en el print
            print(f"Col: {ascii(row[0])}, Type: {ascii(row[1])}")
        print("COLUMNS_END")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {ascii(str(e))}")

if __name__ == "__main__":
    check_schema()
