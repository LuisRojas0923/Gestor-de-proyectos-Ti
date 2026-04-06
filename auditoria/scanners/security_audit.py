"""
Scanner de auditoría de seguridad (ISO 25010).
"""
import os
import re
from ..config import IGNORE_DIRS
from ..patterns.security_patterns import (
    get_all_security_patterns,
    get_all_reliability_patterns,
    get_security_suggestion,
    get_reliability_suggestion
)

def scan_security_issues(root_dir: str) -> list[dict]:
    """Escanea archivos buscando vulnerabilidades de seguridad."""
    issues = []
    patterns = get_all_security_patterns()
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        
        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            # También escanear archivos de configuración para detectar IPs hardcodeadas
            if ext not in ['.py', '.tsx', '.jsx', '.ts', '.js', '.yml', '.yaml']:
                continue
            
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_dir)
            
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                
                for line_num, line_text in enumerate(lines, 1):
                    # Ignorar líneas con comentarios de supresión
                    if '[CONTROLADO]' in line_text or '@audit-ok' in line_text:
                        continue
                        
                    for pattern_name, pattern in patterns.items():
                        if pattern.search(line_text):
                            severity, tag, suggestion = get_security_suggestion(pattern_name)
                            issues.append({
                                'severity': severity,
                                'file': filename,
                                'line': line_num,
                                'element': pattern_name,
                                'suggestion': suggestion,
                                'path': rel_path,
                                'tag': tag
                            })
            except Exception:
                pass
    
    return issues


def _is_inside_try_block(lines: list[str], target_line: int, ext: str) -> bool:
    """
    Verifica si una línea específica está dentro de un bloque try.
    """
    if target_line < 1 or target_line > len(lines):
        return False
    
    # Normalizar líneas para consistencia (tabs a espacios)
    clean_lines = [line.expandtabs(4) for line in lines]
    target_indent = len(clean_lines[target_line - 1]) - len(clean_lines[target_line - 1].lstrip())
    
    if ext == '.py':
        try_pattern = re.compile(r'^\s*try\s*:')
    else:
        try_pattern = re.compile(r'^\s*try\s*\{')

    # Buscar hacia atrás el bloque try más cercano que envuelva a la línea
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
                # No retornamos False aquí para permitir bloques anidados (if, with, for) dentro del try
    return False


def scan_reliability_issues(root_dir: str) -> list[dict]:
    """Escanea archivos buscando problemas de fiabilidad."""
    issues = []
    patterns = get_all_reliability_patterns()
    
    # Archivos de servicio excluidos - el manejo de errores está en la capa de API
    # siguiendo el patrón arquitectónico: Router (try/except) → Servicio → DB
    service_patterns = ['servicio.py', 'service.py', 'services.py']
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        
        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in ['.py', '.tsx', '.jsx', '.ts', '.js']:
                continue
            
            # Excluir archivos de servicio del check de fiabilidad
            parts = re.split(r'[\\/]', dirpath.lower())
            if any(filename.lower().endswith(sp) for sp in service_patterns):
                continue
            if 'services' in parts:
                continue
            
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_dir)
            
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                
                for line_num, line_text in enumerate(lines, 1):
                    # Ignorar líneas con comentarios de supresión
                    if '[CONTROLADO]' in line_text or '@audit-ok' in line_text:
                        continue
                    
                    # Verificar si la línea está dentro de un bloque try
                    if _is_inside_try_block(lines, line_num, ext):
                        continue

                    for pattern_name, pattern in patterns.items():
                        if pattern.search(line_text):
                            severity, tag, suggestion = get_reliability_suggestion(pattern_name)
                            issues.append({
                                'severity': severity,
                                'file': filename,
                                'line': line_num,
                                'element': pattern_name,
                                'suggestion': suggestion,
                                'path': rel_path,
                                'tag': tag
                            })
            except Exception:
                pass
    
    return issues
