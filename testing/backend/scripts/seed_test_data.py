import os
import psycopg2

DB_HOST = os.getenv("DB_HOST", "192.168.40.130")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "project_manager")
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password_segura_refridcol")

def get_conn():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASSWORD
    )

TRUNCATE = os.getenv("SEED_TRUNCATE", "true").lower() == "true"

desarrollos = [
    (2, "HO-2"),
    (5, "HO-5"),
    (7, "HO-7"),
    (39, "HO-39"),
    (64, "HO-64"),
    (72, "HO-72"),
    (101, "HO-101"),
    (115, "HO-115"),
]

actividades_data = [
    ("Configuracion inicial del proyecto", "pendiente", 1),
    ("Diseno de arquitectura", "pendiente", 4),
    ("Desarrollo de API REST", "en_progreso", 8),
    ("Implementacion de base de datos", "pendiente", 6),
    ("Testing unitario", "pendiente", 3),
    ("Despliegue a produccion", "pendiente", 2),
    ("Revision de codigo", "pendiente", 2),
    ("Documentacion tecnica", "pendiente", 3),
    ("Integracion con sistema externo", "pendiente", 5),
    ("Capacitacion usuarios finales", "pendiente", 2),
]

def seed():
    conn = get_conn()
    cur = conn.cursor()

    if TRUNCATE:
        print("Truncating tables...")
        cur.execute("TRUNCATE actividades, desarrollos CASCADE;")
        print("  OK")

    print("Inserting developments...")
    for dev_id, codigo in desarrollos:
        cur.execute(
            """
            INSERT INTO desarrollos (id, nombre, modulo, tipo, estado_general, porcentaje_progreso, fecha_inicio, fecha_estimada_fin)
            VALUES (%s, %s, %s, %s, %s, 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
            ON CONFLICT (id) DO NOTHING;
            """,
            (dev_id, f"Desarrollo {codigo}", codigo, "desarrollo", "en_progreso")
        )
    conn.commit()
    print(f"  {len(desarrollos)} developments inserted")

    print("Inserting activities...")
    count = 0
    for dev_id, _ in desarrollos:
        for titulo, estado, horas in actividades_data:
            cur.execute(
                """
                INSERT INTO actividades
                (desarrollo_id, titulo, descripcion, estado, horas_estimadas, horas_reales, porcentaje_avance, fecha_inicio_estimada, fecha_fin_estimada)
                VALUES (%s, %s, %s, %s, %s, 0, 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days');
                """,
                (dev_id, titulo, f"Descripcion de: {titulo}", estado, horas)
            )
            count += 1
    conn.commit()
    print(f"  {count} activities inserted")

    print("Seeding complete.")

    cur.execute("SELECT COUNT(*) FROM actividades;")
    total = cur.fetchone()[0]
    print(f"Total activities in DB: {total}")

    cur.execute("SELECT COUNT(*) FROM desarrollos;")
    total_devs = cur.fetchone()[0]
    print(f"Total developments in DB: {total_devs}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    seed()
