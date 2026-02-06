
import psycopg2
import sys

# Force encoding to utf-8 for stdout
sys.stdout.reconfigure(encoding='utf-8')

host = "192.168.40.126"
user = "user"
password = "password"
dbname = "project_manager"

print(f"--- DIAGNOSTIC START ---")
print(f"Target: {host}:5432")
print(f"User: {user}")

try:
    conn = psycopg2.connect(
        host=host,
        user=user,
        password=password,
        database=dbname,
        connect_timeout=5
    )
    print("SUCCESS: Connected!")
    conn.close()
except psycopg2.OperationalError as e:
    print("FAILURE: OperationalError")
    print(f"PGCODE: {getattr(e, 'pgcode', 'None')}")
    # Print raw bytes of the error message to avoid decode errors, then try to decode safely
    msg = str(e)
    print(f"Error Message: {msg}")
except Exception as e:
    print(f"FAILURE: {type(e).__name__}")
    print(str(e))
print("--- DIAGNOSTIC END ---")
