
import psycopg2
import sys

host = "192.168.40.126"
user = "user"
password = "password"
dbname = "project_manager"

print("START_DIAGNOSTIC")
try:
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
    # Do NOT print str(e) to avoid UnicodeDecodeError
    code = getattr(e, 'pgcode', 'NO_CODE')
    print(f"FAILURE_OPERATIONAL_ERROR_CODE_{code}")
    # Try to print repr which is safer
    try:
        print(f"REPR: {repr(e)}")
    except:
        print("COULD_NOT_PRINT_REPR")

except Exception as e:
    print(f"FAILURE_GENERAL_{type(e).__name__}")
print("END_DIAGNOSTIC")
