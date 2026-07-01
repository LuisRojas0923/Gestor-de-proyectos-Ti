import psycopg2

conn = psycopg2.connect(
    host="192.168.40.130", port=5432, dbname="project_manager",
    user="user", password="password_segura_refridcol"
)
cur = conn.cursor()

print("=== Estados en actividades ===")
cur.execute("SELECT DISTINCT estado FROM actividades ORDER BY estado;")
for row in cur.fetchall(): print(f"  '{row[0]}'")

print("\n=== Estados en desarrollos ===")
cur.execute("SELECT DISTINCT estado_general FROM desarrollos ORDER BY estado_general;")
for row in cur.fetchall(): print(f"  '{row[0]}'")

print("\n=== Modulos/Areas en desarrollos ===")
cur.execute("SELECT DISTINCT modulo FROM desarrollos WHERE modulo IS NOT NULL ORDER BY modulo;")
for row in cur.fetchall(): print(f"  '{row[0]}'")

print("\n=== Muestra 5 actividades ===")
cur.execute("SELECT id, desarrollo_id, titulo, estado, porcentaje_avance, fecha_inicio_estimada, fecha_fin_estimada, seguimiento FROM actividades LIMIT 5;")
for row in cur.fetchall():
    print(f"  id={row[0]} dev={row[1]} titulo='{row[2]}' estado='{row[3]}' avance={row[4]} ini={row[5]} fin={row[6]} seg='{row[7]}'")

conn.close()
