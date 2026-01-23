
import psycopg2
import os
import sys

# Raw connection string from .env
CONN_STR = "postgresql://postgres:AdminSolid2025@127.0.0.1:5432/project_manager"

def debug_psycopg2():
    print(f"Python version: {sys.version}")
    print(f"Default encoding: {sys.getdefaultencoding()}")
    print(f"FileSystem encoding: {sys.getfilesystemencoding()}")
    
    # Try to connect and catch the exact point of failure
    try:
        print("Attempting psycopg2.connect...")
        conn = psycopg2.connect(CONN_STR)
        print("Connected successfully!")
        conn.close()
    except UnicodeDecodeError as e:
        print(f"DECODE ERROR: {e}")
        print(f"Object being decoded: {e.object}")
        print(f"Start: {e.start}, End: {e.end}")
        print(f"Reason: {e.reason}")
        
        # If possible, show what's around position 79-85
        try:
            raw_obj = e.object
            if isinstance(raw_obj, bytes):
                snippet = raw_obj[max(0, e.start-20):min(len(raw_obj), e.end+20)]
                print(f"Snippet around error (hex): {snippet.hex()}")
                print(f"Snippet around error (repr): {repr(snippet)}")
        except:
            pass
    except Exception as e:
        print(f"OTHER ERROR: {type(e).__name__}: {e}")

if __name__ == "__main__":
    debug_psycopg2()
