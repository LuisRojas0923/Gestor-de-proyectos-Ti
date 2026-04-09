import sys
import os
import re
# Adding root to sys.path to find auditoria package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Backend AST Security Auditor - Detect vulnerabilities and reliability issues
# usage: python scripts/security_check_backend.py <list_of_files>

def main():
    files = sys.argv[1:]
    violations = 0
    
    # scan_security_issues in auditoria package scans a directory by default.
    from auditoria.patterns.security_patterns import get_all_security_patterns, get_security_suggestion
    from auditoria.patterns.security_patterns import get_all_reliability_patterns, get_reliability_suggestion
    
    security_patterns = get_all_security_patterns()
    reliability_patterns = get_all_reliability_patterns()
    
    def _is_inside_try_block(lines: list[str], target_line: int, ext: str) -> bool:
        """Verifica si una línea específica está dentro de un bloque try."""
        if target_line < 1 or target_line > len(lines):
            return False
        clean_lines = [line.expandtabs(4) for line in lines]
        target_indent = len(clean_lines[target_line - 1]) - len(clean_lines[target_line - 1].lstrip())
        if ext == '.py':
            try_pattern = re.compile(r'^\s*try\s*:')
        else:
            try_pattern = re.compile(r'^\s*try\s*\{')
        for i in range(target_line - 2, -1, -1):
            line = clean_lines[i]
            stripped = line.strip()
            if not stripped or stripped.startswith('#') or stripped.startswith('//'):
                continue
            line_indent = len(line) - len(line.lstrip())
            if line_indent < target_indent:
                if try_pattern.search(line):
                    return True
                # En Python, si encontramos una definición de función o clase con menor indentación,
                # ya no estamos en el bloque original.
                if ext == '.py':
                    if re.match(r'^\s*(def|class)\b', line):
                        return False
        return False

    for file_path in files:
        if not os.path.exists(file_path):
            continue
            
        ext = os.path.splitext(file_path)[1].lower()
        # Skip .env files and reliability check for services, scripts and tests
        if os.path.basename(file_path).startswith(".env"):
            continue
            
        is_service = "services" in file_path.lower() or file_path.lower().endswith("service.py") or file_path.lower().endswith("servicio.py")
        is_script_or_test = "scripts" in file_path.lower() or "/tests/" in file_path.lower().replace("\\", "/") or os.path.basename(file_path).startswith("test_")
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            for line_num, line_text in enumerate(lines, 1):
                # Ignore controlled marks
                if '[CONTROLADO]' in line_text or '@audit-ok' in line_text:
                    continue
                
                # Check Security Patterns
                for name, pattern in security_patterns.items():
                    if pattern.search(line_text):
                        severity, tag, suggestion = get_security_suggestion(name)
                        print(f"[{severity}] SECURITY ERROR: In {file_path}:{line_num}")
                        print(f"       {name}: {suggestion}")
                        violations += 1
                
                # Check Reliability Patterns (context-aware + skip services/scripts/tests)
                if not (is_service or is_script_or_test):
                    for name, pattern in reliability_patterns.items():
                        if pattern.search(line_text):
                            # Si está en un try, se considera controlado
                            if _is_inside_try_block(lines, line_num, ext):
                                continue
                                
                            severity, tag, suggestion = get_reliability_suggestion(name)
                            print(f"[{severity}] RELIABILITY ERROR: In {file_path}:{line_num}")
                            print(f"       {name}: {suggestion}")
                            violations += 1
                        
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            
    if violations > 0:
        print(f"\nTotal security/reliability violations: {violations}")
        sys.exit(1)
        
    print("Security and Reliability validation passed.")
    sys.exit(0)

if __name__ == "__main__":
    main()
