import os
import psycopg2
from app.seed_data_actividades import COMMON_DEV_CONFIG, DEVELOPMENTS_DATA

# Obtener URL de base de datos del entorno
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    DB_URL = "postgresql://user:password_segura_refridcol@db:5432/project_manager"

def main():
    print("=" * 60)
    print(" CARGA DE DESARROLLOS Y MATRICES DE ACTIVIDADES INDEPENDIENTES")
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
        for dev_data in DEVELOPMENTS_DATA:
            dev_id = dev_data["id"]
            print(f"\n📁 Procesando desarrollo '{dev_id}' - {dev_data['nombre']}...")
            
            # Limpiar actividades previas del desarrollo para garantizar idempotencia
            cur.execute("DELETE FROM validaciones_asignacion WHERE desarrollo_id = %s", (dev_id,))
            cur.execute("DELETE FROM actividades WHERE desarrollo_id = %s", (dev_id,))
            cur.execute("DELETE FROM desarrollos WHERE id = %s", (dev_id,))

            # Preparar payload de desarrollo
            dev_payload = {**COMMON_DEV_CONFIG, **dev_data}
            
            # Crear el desarrollo
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
            """, dev_payload)
            print(f"  ✅ Desarrollo creado.")

            # Crear las subtareas
            for tarea_titulo in dev_data["tareas"]:
                cur.execute("""
                    INSERT INTO actividades (
                        desarrollo_id, parent_id, titulo, descripcion, estado, 
                        responsable_id, asignado_a_id, delegado_por_id,
                        estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en
                    ) VALUES (
                        %s, NULL, %s, NULL, 'Pendiente',
                        'USR-1107068093', 'USR-1107068093', 'USR-14836440',
                        'aprobada', 0.0, 0.0, 0.0, NOW()
                    ) RETURNING id;
                """, (dev_id, tarea_titulo))
                new_act_id = cur.fetchone()[0]
                print(f"    - Subtarea [{new_act_id}]: {tarea_titulo}")

        # Guardar cambios
        conn.commit()
        print("\n🎉 ¡Carga masiva de todos los desarrollos completada con éxito!")
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error durante la inserción (se aplicó ROLLBACK): {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
