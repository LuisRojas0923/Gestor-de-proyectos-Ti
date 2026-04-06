import sys
import os

# Clean Room Guardian - Detect sensitive keywords in staged files
# usage: python scripts/guard_keywords.py <list_of_files>

KEYWORDS = ["password", "api_key", "secret_key", "private_key", "access_token", "hardcoded_ip", "192.168.", "10.0."]

def main():
    files = sys.argv[1:]
    violations = 0
    
    for file_path in files:
        if not os.path.exists(file_path):
            continue
            
        # Ignore dist and map files
        if any(ignore in file_path.lower() for ignore in ["dist/", ".map", ".min.js", "node_modules/", ".env", "settings.tsx"]):
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                
                for i, line in enumerate(lines, 1):
                    # Ignorar líneas con comentarios de supresión
                    if '[CONTROLADO]' in line or '@audit-ok' in line:
                        continue
                        
                    for keyword in KEYWORDS:
                        if keyword.lower() in line.lower():
                            print(f"ERROR: Sensitive keyword '{keyword}' found in {file_path}:{i}")
                            violations += 1
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            
    if violations > 0:
        print(f"\nTotal violations: {violations}. Please remove sensitive data before committing.")
        sys.exit(1)
        
    sys.exit(0)

if __name__ == "__main__":
    main()
