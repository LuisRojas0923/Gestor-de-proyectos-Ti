import sys
import os
import re

# Clean Room Guardian - Detect sensitive keywords in staged files
# usage: python scripts/guard_keywords.py <list_of_files>

KEYWORDS = ["password", "api_key", "secret_key", "private_key", "access_token", "hardcoded_ip", "192.168.", "10.0."]

def main():
    files = sys.argv[1:]
    violations = 0
    
    for file_path in files:
        if not os.path.exists(file_path):
            continue
            
        # Ignore dist, map, config files, and specific UI components with false positives
        ignored_files = [
            "dist/", ".map", ".min.js", "node_modules/", ".env", 
            "settings.tsx", "logging_config.py", "metrics.py", 
            "middleware_tracing.py", "input.tsx"
        ]
        if any(ignore.lower() in file_path.lower() for ignore in ignored_files):
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                
                for i, line in enumerate(lines, 1):
                    # Ignorar líneas con comentarios de supresión
                    if '[CONTROLADO]' in line or '@audit-ok' in line:
                        continue
                        
                    for keyword in KEYWORDS:
                        # Regex para detectar asignaciones: keyword = "valor" o keyword: "valor"
                        # Esto permite usar la palabra en listas o tipos (ej: type="password")
                        pattern = rf'(?i)({keyword})\s*[:=]\s*["\'][^"\']+["\']'
                        if re.search(pattern, line):
                            print(f"ERROR: Hardcoded sensitive data '{keyword}' found in {file_path}:{i}")
                            violations += 1
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            
    if violations > 0:
        print(f"\nTotal violations: {violations}. Please remove sensitive data before committing.")
        sys.exit(1)
        
    sys.exit(0)

if __name__ == "__main__":
    main()
