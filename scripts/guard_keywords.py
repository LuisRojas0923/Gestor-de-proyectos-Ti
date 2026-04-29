import sys
import os

# Clean Room Guardian - Detect sensitive keywords in staged files
# usage: python scripts/guard_keywords.py <list_of_files>

KEYWORDS = ["hardcoded_ip", "192.168.", "10.0."]

# Carpetas técnicas que se excluyen del escaneo
IGNORE_DIRS = [
    "dist/", ".map", ".min.js", "node_modules/", ".env", "settings.tsx",
    "auditoria/", "scripts/", "tools/", "testing/", "monitoring/", "package-lock.json", "macros/", "docs/", ".png", ".jpg", ".jpeg", ".pdf", "herramientas_data.json"
]

def main():
    files = sys.argv[1:]
    violations = 0
    
    for file_path in files:
        if not os.path.exists(file_path):
            continue
            
        # Ignorar directorios técnicos configurados
        if any(ignore in file_path.replace("\\", "/").lower() for ignore in IGNORE_DIRS):
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
                            print(f"ERROR: Hardcoded IP pattern '{keyword}' found in {file_path}:{i}")
                            violations += 1
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            
    if violations > 0:
        print(f"\nTotal IP violations: {violations}. Please use dynamic configuration before committing.")
        sys.exit(1)
        
    sys.exit(0)



if __name__ == "__main__":
    main()
