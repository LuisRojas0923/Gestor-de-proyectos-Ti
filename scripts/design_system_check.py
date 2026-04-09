import sys
import os

# Adding root to sys.path to find auditoria package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Frontend Design System Enforcer - usage: python scripts/design_system_check.py <list_of_files>

def main():
    files = sys.argv[1:]
    violations = 0
    
    from auditoria.patterns.design_patterns import get_all_design_patterns, get_suggestion, is_exception
    
    patterns = get_all_design_patterns()
    
    for file_path in files:
        if not os.path.exists(file_path):
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                
                for i, line in enumerate(lines, 1):
                    # Ignorar líneas con comentarios de supresión
                    if '[CONTROLADO]' in line or '@audit-ok' in line:
                        continue
                        
                    # Check for patterns from design system
                    for pattern_name, pattern in patterns.items():
                        if pattern.search(line):
                            # Verificar excepciones (archivos base)
                            if is_exception(file_path, pattern_name):
                                continue
                                
                            severity, tag, suggestion = get_suggestion(pattern_name, file_path)
                            print(f"[DESIGN SYSTEM] Violation in {file_path}:{i}")
                            print(f"                {pattern_name}: {suggestion}")
                            violations += 1
                            
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            
    if violations > 0:
        print(f"\nTotal Design System violations: {violations}")
        sys.exit(1)
        
    print("Design System validation passed.")
    sys.exit(0)

if __name__ == "__main__":
    main()
