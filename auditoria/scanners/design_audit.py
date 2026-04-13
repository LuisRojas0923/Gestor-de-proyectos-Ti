"""
Scanner de auditoría del sistema de diseño.
"""
import os
from ..config import IGNORE_DIRS
from ..patterns.design_patterns import (
    get_all_design_patterns, 
    is_exception, 
    get_suggestion
)

def scan_design_issues(root_dir: str, file_list: list[str] = None) -> list[dict]:
    """
    Escanea archivos TSX/JSX buscando violaciones del sistema de diseño.
    """
    issues = []
    patterns = get_all_design_patterns()
    
    # Decidir qué archivos procesar
    if file_list is not None:
        targets = []
        for f in file_list:
            p = f if os.path.isabs(f) else os.path.join(root_dir, f)
            targets.append((os.path.dirname(p), os.path.basename(p)))
    else:
        targets_walk = []
        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
            for f in filenames:
                targets_walk.append((dirpath, f))
        targets = targets_walk

    for dirpath, filename in targets:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ['.tsx', '.jsx']:
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
                        # Verificar excepciones
                        if is_exception(rel_path, pattern_name):
                            continue
                        
                        severity, tag, suggestion = get_suggestion(pattern_name, rel_path)
                        
                        issues.append({
                            'severity': severity,
                            'file': filename,
                            'line': line_num,
                            'element': pattern_name,
                            'suggestion': suggestion,
                            'path': rel_path,
                            'tag': tag,
                            'severity_rank': 1 if severity == 'Crítico' else 2 if severity == 'Importante' else 3
                        })
        except Exception:
            pass
    
    return issues
