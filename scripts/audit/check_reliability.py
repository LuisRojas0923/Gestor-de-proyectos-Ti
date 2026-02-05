import os
import sys
from auditoria.scanners.security_audit import scan_reliability_issues
from auditoria.config import get_project_root

def main():
    root_dir = get_project_root()
    print(f"=== Auditoría de Fiabilidad (Headless) ===")
    print(f"Escaneando: {root_dir}")
    print("-" * 50)
    
    issues = scan_reliability_issues(root_dir)
    
    if not issues:
        print("\n✅ ¡Felicidades! No se encontraron violaciones de fiabilidad.")
        print("Todas las llamadas de red y base de datos están correctamente controladas.")
    else:
        print(f"\n⚠️ Se encontraron {len(issues)} potenciales violaciones:")
        for issue in issues:
            print(f"[{issue['severity']}] {issue['file']}:{issue['line']} - {issue['element']}")
            print(f"      Sugerencia: {issue['suggestion']}")
            print(f"      Ruta: {issue['path']}")
            print("-" * 30)

if __name__ == "__main__":
    main()
