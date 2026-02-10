
import psycopg2
import os

host = "192.168.40.126"
user = "user"
password = "password"
dbname = "project_manager"

try:
    print(f"Connecting to {host}...")
    conn = psycopg2.connect(
        host=host,
        user=user,
        password=password,
        database=dbname,
        connect_timeout=5
    )
    print("SUCCESS")
    conn.close()
except psycopg2.OperationalError as e:
    print("OPERATIONAL_ERROR")
    print(e.pgcode)
    # Print first line of error only to avoid encoding mess
    print(str(e).split('\n')[0])
except Exception as e:
    print(f"ERROR: {type(e).__name__}")
    if hasattr(e, 'pgcode'):
        print(f"PGCODE: {e.pgcode}")
    print(str(e).split('\n')[0])
