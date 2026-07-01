import psycopg2

conn = psycopg2.connect(
    host="192.168.40.130", port=5432, dbname="project_manager",
    user="user", password="password_segura_refridcol"
)
cur = conn.cursor()

print("=== Desarrollos ===")
cur.execute("SELECT id, nombre, modulo, estado_general, porcentaje_progreso FROM desarrollos ORDER BY id;")
for row in cur.fetchall():
    print(f"  ID {row[0]}: {row[1]} | Modulo: {row[2]} | Estado: {row[3]} | Avance: {row[4]}%")

print("\n=== Actividades por Desarrollo ===")
cur.execute("""
    SELECT d.nombre, COUNT(a.id), SUM(a.horas_estimadas)
    FROM desarrollos d
    LEFT JOIN actividades a ON d.id = a.desarrollo_id
    GROUP BY d.id, d.nombre ORDER BY d.id;
""")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} actividades, {row[2]} horas estimadas")

print("\n=== Estados de Actividades ===")
cur.execute("SELECT estado, COUNT(*) FROM actividades GROUP BY estado ORDER BY estado;")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
