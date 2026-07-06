from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("No DATABASE_URL found.")
    exit(1)

db_url = db_url.replace("+asyncpg", "")
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- DUPLICADOS POR MAYUSCULAS/MINUSCULAS EN LA MISMA AREA ---")
    query = """
    SELECT UPPER(c.nombre) as nombre_normalizado, a.nombre as area_nombre, COUNT(*) as count 
    FROM cargos_rp c
    JOIN areas_rp a ON c.area_id = a.id
    GROUP BY UPPER(c.nombre), a.nombre 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    """
    res = conn.execute(text(query)).fetchall()  # [CONTROLADO]
    if not res:
        print("Ninguno.")
    for r in res:
        print(f"Cargo (Mayus): '{r[0]}' en Area: '{r[1]}' -> {r[2]} veces")
        
        # Consultar los IDs específicos de este duplicado
        subq = "SELECT id, nombre FROM cargos_rp WHERE UPPER(nombre) = :nombre AND area_id = (SELECT id FROM areas_rp WHERE nombre = :area)"
        subres = conn.execute(text(subq), {"nombre": r[0], "area": r[1]}).fetchall()  # [CONTROLADO]
        for sr in subres:
            print(f"    - ID: {sr[0]} | Nombre original: '{sr[1]}'")
