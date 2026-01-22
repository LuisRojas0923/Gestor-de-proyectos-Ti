
import psycopg2
try:
    conn = psycopg2.connect("postgresql://user:password@192.168.40.96:5432/project_manager")
except Exception as e:
    print(f"Type: {type(e)}")
    try:
        print(f"Message: {e}")
    except UnicodeDecodeError:
        print("Caught UnicodeDecodeError in print(e)")
        print(f"Raw args: {e.args}")
