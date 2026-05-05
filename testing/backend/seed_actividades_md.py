import os, sys
from datetime import datetime

try:
    import psycopg2
except Exception:
    psycopg2 = None

DB_HOST = os.getenv("DB_HOST", "192.168.40.181")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "project_manager")
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password_segura_refridcol")


def connect():
    if psycopg2 is None:
        raise RuntimeError("psycopg2 not installed. Install it or run in an environment with DB access.")
    return psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)


def parse_date(s):
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            continue
    return None


def read_md(path):
    with open(path, 'r', encoding='utf-8') as f:
        return [ln.rstrip('\n') for ln in f]


def clean(value):
    value = (value or '').strip()
    return value or None


def map_estado(estado, estado_tarea):
    task_state = (estado_tarea or '').strip().upper()
    project_state = (estado or '').strip().upper()

    if task_state == '1':
        return 'completada'
    if 'PROCESO' in task_state:
        return 'en_progreso'
    if 'PEND' in task_state or 'VALIDAR' in task_state or 'ESPERA' in task_state:
        return 'pendiente'

    est_map = {'TERMINADO': 'completada', 'EN PROCESO': 'en_progreso', 'EN ESPERA': 'pendiente'}
    return est_map.get(project_state, 'pendiente')


def insert_data(developments, activities):
    if not developments:
        print('No hay desarrollos para insertar')
        return

    with connect() as conn:
        with conn.cursor() as cur:
            for dev in developments.values():
                cur.execute(
                    """
                    INSERT INTO desarrollos (
                        id, nombre, descripcion, modulo, tipo, responsable, area_desarrollo,
                        analista, estado_general, porcentaje_progreso, fecha_inicio, fecha_estimada_fin
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        nombre = EXCLUDED.nombre,
                        descripcion = EXCLUDED.descripcion,
                        modulo = EXCLUDED.modulo,
                        tipo = EXCLUDED.tipo,
                        responsable = EXCLUDED.responsable,
                        area_desarrollo = EXCLUDED.area_desarrollo,
                        analista = EXCLUDED.analista,
                        estado_general = EXCLUDED.estado_general,
                        porcentaje_progreso = EXCLUDED.porcentaje_progreso,
                        fecha_inicio = EXCLUDED.fecha_inicio,
                        fecha_estimada_fin = EXCLUDED.fecha_estimada_fin
                    """,
                    (
                        dev['id'], dev['nombre'], dev['descripcion'], dev['modulo'], dev['tipo'],
                        dev['responsable'], dev['area_desarrollo'], dev['analista'], dev['estado_general'],
                        dev['porcentaje_progreso'], dev['fecha_inicio'], dev['fecha_estimada_fin']
                    ),
                )

            cur.execute(
                "DELETE FROM actividades WHERE desarrollo_id = ANY(%s)",
                (list(developments.keys()),),
            )

            for act in activities:
                cur.execute(
                    """
                    INSERT INTO actividades (
                        desarrollo_id, titulo, descripcion, estado, fecha_inicio_estimada,
                        fecha_fin_estimada, horas_estimadas, horas_reales, porcentaje_avance,
                        seguimiento, compromiso, archivo_url
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        act['desarrollo_id'], act['titulo'], act['descripcion'], act['estado'],
                        act['fecha_inicio_estimada'], act['fecha_fin_estimada'], act['horas_estimadas'],
                        act['horas_reales'], act['porcentaje_avance'], act['seguimiento'],
                        act['compromiso'], act['archivo_url']
                    ),
                )

        conn.commit()


def main():
    md_path = os.path.join(os.getcwd(), 'seed actividades.md')
    if not os.path.exists(md_path):
        print("seed actividades.md not found at project root", file=sys.stderr)
        sys.exit(2)

    lines = read_md(md_path)

    developments = {}
    activities = []

    # Block 1: development level
    in_initial = False
    for line in lines:
        if line.strip().startswith('Id') and 'Fechas Inicio' in line:
            in_initial = True
            continue
        if line.strip().startswith('Id') and 'Tarea' in line:
            break
        if in_initial and line.startswith('HO-'):
            parts = [p.strip() for p in line.split("\t")]
            if len(parts) >= 13:
                code = parts[0]
                name = parts[5] or f"Desarrollo {code}"
                developments[code] = {
                    'id': code,
                    'nombre': name,
                    'descripcion': clean(parts[8] if len(parts) > 8 else ''),
                    'modulo': code,
                    'tipo': clean(parts[4] if len(parts) > 4 else ''),
                    'responsable': clean(parts[1] if len(parts) > 1 else ''),
                    'area_desarrollo': clean(parts[11] if len(parts) > 11 else ''),
                    'analista': clean(parts[12] if len(parts) > 12 else ''),
                    'estado_general': map_estado(parts[10] if len(parts) > 10 else '', ''),
                    'porcentaje_progreso': int((parts[9] if len(parts) > 9 else '0').replace('%', '') or 0),
                    'fecha_inicio': parse_date(parts[6] if len(parts) > 6 else ''),
                    'fecha_estimada_fin': parse_date(parts[7] if len(parts) > 7 else ''),
                }

    # Block 2: activities (detailed block header is later in the MD)
    in_details = False
    for line in lines:
        if line.strip().startswith('Id') and 'Tarea' in line:
            in_details = True
            continue
        if not in_details:
            continue
        if line.startswith('HO-'):
            parts = [p.strip() for p in line.split("\t")]
            if not parts:
                continue
            code = parts[0]
            if code not in developments:
                # skip codes not in the first block
                continue
            tarea = clean(parts[13] if len(parts) > 13 else '')
            if not tarea:
                continue
            titulo = tarea
            inicio = parts[6] if len(parts) > 6 else ''
            fin = parts[7] if len(parts) > 7 else ''
            pct = parts[9] if len(parts) > 9 else '0'
            estado = parts[10] if len(parts) > 10 else 'pendiente'
            obj = parts[11] if len(parts) > 11 else ''
            estado_tarea = parts[14] if len(parts) > 14 else ''
            seguimiento = clean(parts[15] if len(parts) > 15 else '')
            compromiso = clean(parts[16] if len(parts) > 16 else '')
            archivo = clean(parts[17] if len(parts) > 17 else '')

            estado_bd = map_estado(estado, estado_tarea)
            try:
                avance = int(pct.replace('%',''))
            except Exception:
                avance = 0

            activities.append({
                'desarrollo_id': code,
                'titulo': titulo,
                'descripcion': obj,
                'estado': estado_bd,
                'fecha_inicio_estimada': parse_date(inicio),
                'fecha_fin_estimada': parse_date(fin),
                'horas_estimadas': 0,
                'horas_reales': 0,
                'porcentaje_avance': avance,
                'seguimiento': seguimiento,
                'compromiso': compromiso,
                'archivo_url': archivo,
            })

    # Debug print
    print(f"Desarrollos encontrados: {len(developments)}")
    for k, v in developments.items():
        print(k, v)
    print(f"Actividades encontradas: {len(activities)}")
    for a in activities[:5]:
        print(a)

    insert_data(developments, activities)
    print(f"Insertados/actualizados {len(developments)} desarrollos y {len(activities)} actividades desde seed actividades.md")

if __name__ == '__main__':
    main()
