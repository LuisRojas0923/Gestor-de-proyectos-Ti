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

def scan_structure_issues(root_dir: str) -> list[dict]:
    """Ejecuta todas las auditorías de estructura."""
    issues = []
    
    # Detectar archivos duplicados (solo TSX/JSX)
    duplicates = find_duplicate_files(root_dir, {'.tsx', '.jsx'})
    for dup in duplicates:
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
    
    # Detectar componentes sin documentar en catálogo
    catalog_path = os.path.join(root_dir, 'frontend', 'src', 'pages', 'DesignSystemCatalog.tsx')
    undocumented = find_undocumented_components(root_dir, catalog_path)
    for item in undocumented:
        issues.append({
            'severity': item['severity'],
            'file': item['file'],
            'line': '-',
            'element': item['type'],
            'suggestion': item['suggestion'],
            'path': item['path'],
            'tag': item['tag']
        })
    
    # Detectar exports huérfanos en molecules/index.ts
    molecules_index = os.path.join(root_dir, 'frontend', 'src', 'components', 'molecules', 'index.ts')
    molecules_dir = os.path.join(root_dir, 'frontend', 'src', 'components', 'molecules')
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
