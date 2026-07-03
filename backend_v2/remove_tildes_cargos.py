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

with engine.begin() as conn:
    print("--- 1. QUITANDO TILDES DE TODOS LOS CARGOS ---")
    
    # Remove accents using Postgres translate function
    remove_tildes_query = """
    UPDATE cargos_rp 
    SET nombre = translate(nombre, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')
    WHERE nombre ~ '[ÁÉÍÓÚáéíóú]'
    """
    res = conn.execute(text(remove_tildes_query))
    print(f"Se quitaron tildes en {res.rowcount} cargos.")
    
    print("--- 2. ELIMINANDO DUPLICADOS RESULTANTES ---")
    query = """
    SELECT UPPER(nombre) as nombre_normalizado, area_id
    FROM cargos_rp
    GROUP BY UPPER(nombre), area_id
    HAVING COUNT(*) > 1
    """
    duplicates = conn.execute(text(query)).fetchall()
    
    total_eliminados = 0
    total_actualizados = 0

    for dup in duplicates:
        nombre_norm = dup[0]
        area_id = dup[1]
        
        # Obtener todos los IDs ordenados (el menor es el original)
        subq = "SELECT id FROM cargos_rp WHERE UPPER(nombre) = :nombre AND area_id = :area_id ORDER BY id ASC"
        ids = [r[0] for r in conn.execute(text(subq), {"nombre": nombre_norm, "area_id": area_id}).fetchall()]
        
        if len(ids) > 1:
            original_id = ids[0]
            duplicate_ids = ids[1:]
            
            # 1. Reasignar requisiciones que usen los IDs duplicados hacia el ID original
            upd_req = "UPDATE requisiciones_personal SET cargo_id = :original WHERE cargo_id = ANY(:duplicates) RETURNING id"
            res_req = conn.execute(text(upd_req), {"original": original_id, "duplicates": duplicate_ids}).fetchall()
            total_actualizados += len(res_req)
            
            # 2. Eliminar los duplicados
            del_cargos = "DELETE FROM cargos_rp WHERE id = ANY(:duplicates)"
            conn.execute(text(del_cargos), {"duplicates": duplicate_ids})
            total_eliminados += len(duplicate_ids)
            
            print(f"[{nombre_norm}] Original: {original_id}, Eliminados: {duplicate_ids}")

    print(f"\nResumen: {total_eliminados} cargos duplicados eliminados. {total_actualizados} requisiciones reasignadas al ID original.")
