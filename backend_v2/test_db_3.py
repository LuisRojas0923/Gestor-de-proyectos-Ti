
import psycopg2
try:
    conn = psycopg2.connect(host="127.0.0.1", user="postgres", password="AdminSolid2025", dbname="project_manager")
    print("Connected!")
except Exception as e:
    print(f"Type: {type(e)}")
    print(f"Repr: {repr(e)}")
