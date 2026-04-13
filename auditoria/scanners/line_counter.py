"""
Scanner de conteo de líneas y métricas de código.
"""
import os
import re
from ..config import IGNORE_DIRS, TARGET_EXTENSIONS, EXCLUDE_FILES, THRESHOLDS

def count_lines(root_dir: str, file_list: list[str] = None) -> list[dict]:
    """
    Escanea el proyecto y cuenta líneas, imports, complejidad.
    Retorna lista de métricas por archivo.
    """
    file_data = []
    
    import_pattern = re.compile(r'^(import\s|from\s)')
    complexity_pattern = re.compile(r'\b(if|else|elif|map|switch|case|while|for|catch|finally)\b')
    comment_pattern = re.compile(r'^\s*(//|#|/\*)')
    
    # Decidir qué archivos procesar
    if file_list is not None:
        targets = []
        for f in file_list:
            # Asegurar que el path sea absoluto si no lo es
            p = f if os.path.isabs(f) else os.path.join(root_dir, f)
            targets.append((os.path.dirname(p), os.path.basename(p)))
    else:
        # Modo tradicional: walk completo
        targets_walk = []
        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
            for f in filenames:
                targets_walk.append((dirpath, f))
        targets = targets_walk

    for dirpath, filename in targets:
        if filename in EXCLUDE_FILES:
            continue
        
        ext = os.path.splitext(filename)[1].lower()
        if ext not in TARGET_EXTENSIONS and filename not in ['Dockerfile', '.dockerignore']:
            continue
        
        full_path = os.path.join(dirpath, filename)
        
        # Obtener el módulo basado en la carpeta
        rel_dir = os.path.relpath(dirpath, root_dir)
        if rel_dir == '.':
            module = 'RAIZ'
        else:
            parts = rel_dir.split(os.sep)
            module = parts[0].upper() if parts[0] else 'RAIZ'
        
        try:
            import_count = 0
            complexity_score = 0
            comment_lines = 0
            line_count = 0
            
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line_text in f:
                    line_count += 1
                    stripped = line_text.strip()
                    
                    if import_pattern.match(stripped):
                        import_count += 1
                    
                    complexity_score += len(complexity_pattern.findall(line_text))
                    
                    if comment_pattern.match(stripped):
                        comment_lines += 1
            
            if line_count == 0:
                continue
            
            comment_ratio = round((comment_lines / line_count) * 100, 1)
            rel_path = os.path.relpath(full_path, root_dir)
            
            # Determinar severidad
            if line_count > THRESHOLDS['lines_critical']:
                size_tag = 'large'
            elif line_count > THRESHOLDS['lines_warning']:
                size_tag = 'medium'
            else:
                size_tag = 'small'
            
            file_data.append({
                'lines': line_count,
                'imports': import_count,
                'complexity': complexity_score,
                'comments': f"{comment_ratio}%",
                'module': module,
                'filename': filename,
                'extension': ext,
                'path': rel_path,
                'size_tag': size_tag
            })
            
        except Exception:
            pass
    
    # Ordenar por líneas descendente
    file_data.sort(key=lambda x: x['lines'], reverse=True)
    return file_data

def get_summary(file_data: list[dict]) -> dict:
    """Retorna resumen de métricas del proyecto."""
    total_lines = sum(f['lines'] for f in file_data)
    total_files = len(file_data)
    large_files = sum(1 for f in file_data if f['lines'] > THRESHOLDS['lines_warning'])
    high_imports = sum(1 for f in file_data if f['imports'] > THRESHOLDS['imports_warning'])
    high_complexity = sum(1 for f in file_data if f['complexity'] > THRESHOLDS['complexity_warning'])
    
    return {
        'total_lines': total_lines,
        'total_files': total_files,
        'large_files': large_files,
        'high_imports': high_imports,
        'high_complexity': high_complexity
    }
