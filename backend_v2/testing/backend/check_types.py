import psycopg2
conn = psycopg2.connect(host="192.168.40.130", port=5432, dbname="project_manager", user="user", password="password_segura_refridcol")
cur = conn.cursor()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'actividades' ORDER BY ordinal_position")
for row in cur.fetchall():
    print(f"{row[0]}: {row[1]}")
conn.close()
