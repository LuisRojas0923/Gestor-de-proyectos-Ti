
import psycopg2
import sys

try:
    print("Attempting to connect to 192.168.40.126...")
    conn = psycopg2.connect(
        host="192.168.40.126",
        port="5432",
        database="project_manager",
        user="user",
        password="password",
        connect_timeout=5
    )
    print("SUCCESS: Connection established.")
    conn.close()
except Exception as e:
    print(f"FAILURE: {e}")
