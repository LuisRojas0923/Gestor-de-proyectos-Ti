
import psycopg2
import os
try:
    print(f"Connecting with DATABASE_URL={os.environ.get('DATABASE_URL')}")
    conn = psycopg2.connect("postgresql://postgres:AdminSolid2025@127.0.0.1:5432/project_manager")
    print("Connected!")
except Exception as e:
    print(f"Type: {type(e)}")
    print(f"Repr: {repr(e)}")
