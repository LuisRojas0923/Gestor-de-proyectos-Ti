from app.database import SQLALCHEMY_DATABASE_URL
import os

print(f"URL: {SQLALCHEMY_DATABASE_URL}")
print(f"ENV DATABASE_URL: {os.getenv('DATABASE_URL')}")

try:
    import psycopg2
    print("Psycopg2 is installed")
    # Try to connect manually if URL is postgres
    if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
        print("Attempting manual connection test...")
        # We don't want to actually connect if we don't have DB, but we want to see if it fails with UnicodeDecodeError
        # conn = psycopg2.connect(SQLALCHEMY_DATABASE_URL)
except ImportError:
    print("Psycopg2 is NOT installed")
except Exception as e:
    print(f"Error: {e}")
