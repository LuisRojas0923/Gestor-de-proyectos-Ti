import os
import psycopg2
from app.seed_data_actividades import DESARROLLO, ACTIVIDADES

# Obtener URL de base de datos del entorno
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    DB_URL = "postgresql://user:password_segura_refridcol@db:5432/project_manager"

def main():
    print("=" * 60)
    print(" CARGA DE DESARROLLO Y MATRIZ DE ACTIVIDADES (CON RESPONSIBILIDADES)")
    print("=" * 60)

    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = False
        cur = conn.cursor()
        print("✅ Conectado a la base de datos.")
    except Exception as e:
        print(f"❌ Error al conectar a la base de datos: {e}")
        return

    try:
        # 1. Crear o actualizar el desarrollo
        cur.execute("SELECT id FROM desarrollos WHERE id = %s", (DESARROLLO["id"],))
        if cur.fetchone():
            print(f"ℹ️ El desarrollo '{DESARROLLO['id']}' ya existe. Limpiando actividades previas...")
            # Limpiar cascada de actividades
            cur.execute("DELETE FROM validaciones_asignacion WHERE desarrollo_id = %s", (DESARROLLO["id"],))
            cur.execute("DELETE FROM actividades WHERE desarrollo_id = %s", (DESARROLLO["id"],))
            # Actualizar el desarrollo
            cur.execute("""
                UPDATE desarrollos 
                SET nombre = %(nombre)s, descripcion = %(descripcion)s, modulo = %(modulo)s, 
                    tipo = %(tipo)s, ambiente = %(ambiente)s, responsable = %(responsable)s,
                    responsable_id = %(responsable_id)s, analista = %(analista)s, autoridad = %(autoridad)s,
                    supervisor = %(supervisor)s, creado_por_id = %(creado_por_id)s,
                    estado_general = %(estado_general)s, estado_validacion = %(estado_validacion)s
                WHERE id = %(id)s
            """, DESARROLLO)
        else:
            print(f"🆕 Creando desarrollo '{DESARROLLO['id']}'...")
            cur.execute("""
                INSERT INTO desarrollos (
                    id, nombre, descripcion, modulo, tipo, ambiente,
                    responsable, responsable_id, analista, autoridad, supervisor, creado_por_id,
                    estado_general, estado_validacion, porcentaje_progreso, creado_en
                ) VALUES (
                    %(id)s, %(nombre)s, %(descripcion)s, %(modulo)s, %(tipo)s, %(ambiente)s,
                    %(responsable)s, %(responsable_id)s, %(analista)s, %(autoridad)s, %(supervisor)s, %(creado_por_id)s,
                    %(estado_general)s, %(estado_validacion)s, %(porcentaje_progreso)s, NOW()
                )
            """, DESARROLLO)
        
        # 2. Insertar las actividades jerárquicamente
        id_map = {}
        for idx, act in enumerate(ACTIVIDADES):
            parent_ref = act["parent_ref"]
            parent_id = None
            if parent_ref is not None:
                parent_id = id_map.get(parent_ref)
                if not parent_id:
                    raise Exception(f"Error de consistencia: el padre con índice {parent_ref} no fue creado antes del hijo {idx}.")

            cur.execute("""
                INSERT INTO actividades (
                    desarrollo_id, parent_id, titulo, descripcion, estado, 
                    responsable_id, asignado_a_id, delegado_por_id,
                    estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    'USR-1107068093', 'USR-1107068093', 'USR-14836440',
                    'aprobada', 0.0, 0.0, 0.0, NOW()
                ) RETURNING id;
            """, (DESARROLLO["id"], parent_id, act["titulo"], act["descripcion"], act["estado"]))
            
            new_id = cur.fetchone()[0]
            id_map[idx] = new_id
            indent = "  " * (0 if parent_ref is None else (2 if parent_ref in id_map else 1))
            print(f"{indent}✅ [{new_id}] {act['titulo']}")

        # 3. Guardar cambios
        conn.commit()
        print("\n🎉 ¡Carga masiva completada con éxito en la base de datos!")
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error durante la inserción (se aplicó ROLLBACK): {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
