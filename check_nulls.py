import psycopg2
import json

conn = psycopg2.connect('dbname=project_manager user=user password=pass host=localhost')
cur = conn.cursor()
cur.execute("SELECT id, accion, modulo, metodo_http, ruta, datos_anteriores, datos_nuevos FROM auditoria_acciones_usuario ORDER BY id DESC LIMIT 20;")
print(f"{'ID':<5} | {'ACCION':<10} | {'MODULO':<15} | {'METODO':<6} | {'RUTA':<30} | {'ANTES':<5} | {'NUEVOS':<5}")
print("-" * 100)
for r in cur.fetchall():
    antes = json.dumps(r[5]) if r[5] else 'null'
    nuevos = json.dumps(r[6]) if r[6] else 'null'
    if (not r[5] or r[5] == {}) and (not r[6] or r[6] == {}):
        print(f"{r[0]:<5} | {str(r[1]):<10} | {str(r[2]):<15} | {str(r[3]):<6} | {str(r[4]):<30} | {antes[:10]:<5} | {nuevos[:10]:<5} <-- MATCH")
    else:
        print(f"{r[0]:<5} | {str(r[1]):<10} | {str(r[2]):<15} | {str(r[3]):<6} | {str(r[4]):<30} | {antes[:10]:<5} | {nuevos[:10]:<5}")
