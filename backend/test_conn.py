import psycopg2
import sys

url = "postgresql://user:password@localhost:5432/project_manager"
print(f"Testing connection to: {url}")

try:
    conn = psycopg2.connect(url)
    print("Connection successful!")
    conn.close()
except UnicodeDecodeError as e:
    print(f"UnicodeDecodeError caught: {e}")
    print(f"Details: {e.object[e.start:e.end]}")
    print(f"Full object (hex): {e.object.hex()}")
except Exception as e:
    print(f"Other error: {e}")
