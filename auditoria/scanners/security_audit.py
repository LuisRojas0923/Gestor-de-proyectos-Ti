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
            if ext not in ['.py', '.tsx', '.jsx', '.ts', '.js', '.yml', '.yaml', '.env']:
                # Archivos sin extensión como ".env" necesitan tratamiento especial
                if not filename.startswith('.env'):
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
    Verifica si una línea específica está dentro de un bloque try/except (Python)
    o try/catch (JavaScript/TypeScript).
    
    Args:
        lines: Lista de líneas del archivo
        target_line: Número de línea a verificar (1-indexed)
        ext: Extensión del archivo (.py, .ts, .tsx, .js, .jsx)
    
    Returns:
        True si la línea está protegida por un bloque try
    """
    if target_line < 1 or target_line > len(lines):
        return False
    
    # Patrones de detección según el lenguaje
    if ext == '.py':
        try_pattern = re.compile(r'^\s*try\s*:')
        except_pattern = re.compile(r'^\s*except\b')
        finally_pattern = re.compile(r'^\s*finally\s*:')
    else:  # JavaScript/TypeScript
        try_pattern = re.compile(r'^\s*try\s*\{')
        except_pattern = re.compile(r'^\s*\}\s*catch\s*\(')
        finally_pattern = re.compile(r'^\s*\}\s*finally\s*\{')
    
    # Obtener la indentación de la línea objetivo
    target_line_text = lines[target_line - 1]
    target_indent = len(target_line_text) - len(target_line_text.lstrip())
    
    # Buscar hacia atrás un bloque try que contenga esta línea
    try_stack = []
    
    for i in range(target_line - 1):
        line = lines[i]
        line_indent = len(line) - len(line.lstrip())
        stripped = line.strip()
        
        if not stripped or stripped.startswith('#') or stripped.startswith('//'):
            continue
        
        # Detectar inicio de try
        if try_pattern.search(line):
            try_stack.append({
                'line': i + 1,
                'indent': line_indent
            })
        
        # Detectar except/catch - cierra el try si tiene la misma indentación
        if except_pattern.search(line) or finally_pattern.search(line):
            if try_stack:
                last_try = try_stack[-1]
                if line_indent <= last_try['indent']:
                    # El except está al mismo nivel o menor, cierra el try
                    if i + 1 >= target_line:
                        # El target está antes del except, está protegido
                        pass
                    else:
                        # El target podría estar después del try block
                        try_stack.pop()
    
    # Verificar si algún try en el stack contiene la línea objetivo
    for try_info in try_stack:
        try_line = try_info['line']
        try_indent = try_info['indent']
        
        # Buscar dónde termina este bloque try (encontrar el except/finally)
        found_end = False
        for i in range(try_line, len(lines)):
            line = lines[i]
            if not line.strip():
                continue
            line_indent = len(line) - len(line.lstrip())
            
            if i >= try_line and (except_pattern.search(line) or finally_pattern.search(line)):
                if line_indent <= try_indent:
                    # Encontramos el except/finally de este try
                    if target_line > try_line and target_line <= i:
                        return True
                    found_end = True
                    break
        
        # Si no encontramos except/finally pero la línea objetivo tiene mayor indentación
        if not found_end and target_line > try_line:
            # La línea objetivo debe tener mayor indentación para estar dentro del try
            if target_indent > try_indent:
                return True
    
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
            if any(filename.lower().endswith(sp) for sp in service_patterns):
                continue
            if 'services' in dirpath.lower().split(os.sep):
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
