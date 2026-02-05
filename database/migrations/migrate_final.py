import psycopg2
from psycopg2 import sql

def migrate():
    try:
        # Intentamos conectar con la codificación que causó el problema para manejarla explícitamente
        conn = psycopg2.connect(
            "dbname=gestion_proyectos user=postgres password=postgres host=localhost"
        )
        conn.set_client_encoding('LATIN1') # Forzamos LATIN1 para que 'ó' (0xf3) no rompa la conexión
        cur = conn.cursor()
        
        print("MIGRATION_START: Cambiando reporte_id a VARCHAR(50)")
        
        # Ejecutamos la migración
        cur.execute("ALTER TABLE transito_viaticos ALTER COLUMN reporte_id TYPE VARCHAR(50) USING reporte_id::VARCHAR")
        
        conn.commit()
        print("MIGRATION_SUCCESS")
        
        cur.close()
        conn.close()
    except Exception as e:
        # Capturamos el error sin intentar decodificarlo si falla
        print(f"MIGRATION_ERROR: {ascii(str(e))}")

if __name__ == "__main__":
    migrate()
