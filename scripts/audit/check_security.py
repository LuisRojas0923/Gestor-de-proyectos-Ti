import os
import sys
from auditoria.scanners.security_audit import scan_security_issues
from auditoria.config import get_project_root

def main():
    root_dir = get_project_root()
    print(f"=== Auditoría de Seguridad (Headless) ===")
    print(f"Escaneando: {root_dir}")
    print("-" * 50)
    
    issues = scan_security_issues(root_dir)
    
    if not issues:
        print("\n✅ ¡Felicidades! No se encontraron vulnerabilidades de seguridad.")
    else:
        print(f"\n⚠️ Se encontraron {len(issues)} potenciales vulnerabilidades:")
        for issue in issues:
            print(f"[{issue['severity']}] {issue['file']}:{issue['line']} - {issue['element']}")
            print(f"      Sugerencia: {issue['suggestion']}")
            print(f"      Ruta: {issue['path']}")
            print("-" * 30)

if __name__ == "__main__":
    main()
