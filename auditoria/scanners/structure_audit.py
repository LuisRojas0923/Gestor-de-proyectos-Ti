"""
Scanner de auditoría de estructura del proyecto.
Detecta duplicados, componentes sin documentar, exports huérfanos.
"""
import os
from ..patterns.structure_patterns import (
    find_duplicate_files,
    find_undocumented_components,
    find_unused_exports
)

def scan_structure_issues(root_dir: str, file_list: list[str] = None) -> list[dict]:
    """Ejecuta todas las auditorías de estructura."""
    issues = []
    
    # Normalizar file_list para comparación rápida si existe
    if file_list:
        normalized_files = {os.path.relpath(os.path.abspath(f), root_dir).lower() for f in file_list}
    else:
        normalized_files = None

    # 1. Detectar archivos duplicados (solo TSX/JSX)
    duplicates = find_duplicate_files(root_dir, {'.tsx', '.jsx'})
    for dup in duplicates:
        # En duplicados, si hay file_list, solo mostrar si alguno de los duplicados está en la lista
        show_dup = True
        if normalized_files:
            show_dup = any(p.lower() in normalized_files for p in dup['paths'])
            
        if show_dup:
            for path in dup['paths']:
                issues.append({
                    'severity': dup['severity'],
                    'file': dup['file'],
                    'line': '-',
                    'element': dup['type'],
                    'suggestion': dup['suggestion'],
                    'path': path,
                    'tag': dup['tag']
                })
    
    # 2. Detectar componentes sin documentar en catálogo
    catalog_path = os.path.join(root_dir, 'frontend', 'src', 'pages', 'DesignSystemCatalog.tsx')
    undocumented = find_undocumented_components(root_dir, catalog_path)
    for item in undocumented:
        # Filtrar por file_list
        if normalized_files:
            # item['path'] suele ser relativo a 'molecules' o similar, hay que reconstruir rel_path real
            # find_undocumented_components usa os.path.join('molecules', filename)
            # El path real es frontend/src/components/molecules/filename
            real_rel_path = f"frontend/src/components/{item['path']}".replace('\\', '/').lower()
            if real_rel_path not in normalized_files:
                continue

        issues.append({
            'severity': item['severity'],
            'file': item['file'],
            'line': '-',
            'element': item['type'],
            'suggestion': item['suggestion'],
            'path': item['path'],
            'tag': item['tag']
        })
    
    # 3. Detectar exports huérfanos en molecules/index.ts
    molecules_index = os.path.join(root_dir, 'frontend', 'src', 'components', 'molecules', 'index.ts')
    molecules_dir = os.path.join(root_dir, 'frontend', 'src', 'components', 'molecules')
    
    # Si el index mismo cambió, o si es un full scan
    check_orphans = True
    if normalized_files:
        rel_index = os.path.relpath(molecules_index, root_dir).lower()
        if rel_index not in normalized_files:
            check_orphans = False
            
    if check_orphans:
        orphan_exports = find_unused_exports(molecules_index, molecules_dir)
        for item in orphan_exports:
            issues.append({
                'severity': item['severity'],
                'file': item['file'],
                'line': '-',
                'element': item['type'],
                'suggestion': item['suggestion'],
                'path': item['path'],
                'tag': item['tag']
            })
    
    return issues
