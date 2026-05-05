import psycopg2

conn = psycopg2.connect(
    host="192.168.40.181", port=5432, dbname="project_manager",
    user="user", password="password_segura_refridcol"
)
cur = conn.cursor()

updates = [
    ("HO-2", "2"),
    ("HO-5", "5"),
    ("HO-7", "7"),
    ("HO-39", "39"),
    ("HO-64", "64"),
    ("HO-72", "72"),
    ("HO-101", "101"),
    ("HO-115", "115"),
]

conn.set_session(autocommit=False)

# Drop FK constraint
cur.execute("ALTER TABLE actividades DROP CONSTRAINT IF EXISTS actividades_desarrollo_id_fkey")
print("  FK constraint dropped")

# Update actividades desarrollo_id
for ho_code, old_id in updates:
    cur.execute("UPDATE actividades SET desarrollo_id = %s WHERE desarrollo_id = %s", (ho_code, old_id))
    print(f"  actividad {old_id} -> {ho_code}")

# Update desarrollos id
for ho_code, old_id in updates:
    cur.execute("UPDATE desarrollos SET id = %s WHERE id = %s", (ho_code, old_id))
    print(f"  desarrollo {old_id} -> {ho_code}")

conn.commit()
print("  All updates committed")

# Recreate FK constraint
cur.execute("ALTER TABLE actividades ADD CONSTRAINT actividades_desarrollo_id_fkey FOREIGN KEY (desarrollo_id) REFERENCES desarrollos(id)")
print("  FK constraint recreated")

conn.commit()

cur.execute("SELECT id, nombre FROM desarrollos ORDER BY id")
print("\nDesarrollos:")
for row in cur.fetchall():
    print(f"  {row}")

cur.execute("SELECT desarrollo_id, COUNT(*) FROM actividades GROUP BY desarrollo_id ORDER BY desarrollo_id")
print("\nActividades por desarrollo:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} actividades")

conn.close()
print("\nDone.")
