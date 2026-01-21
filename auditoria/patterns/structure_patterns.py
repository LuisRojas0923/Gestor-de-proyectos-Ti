"""
Patrones de auditoría de estructura del proyecto.
Detecta duplicación de componentes, archivos sin documentar, etc.
"""
import os
import re
from collections import defaultdict

def find_duplicate_files(root_dir: str, extensions: set) -> list[dict]:
    """
    Encuentra archivos con el mismo nombre en diferentes carpetas.
    Retorna lista de problemas detectados.
    """
    file_locations = defaultdict(list)
    issues = []
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Ignorar carpetas comunes
        dirnames[:] = [d for d in dirnames if d not in {
            'node_modules', '.git', '__pycache__', 'dist', 'build', 'auditoria'
        }]
        
        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext in extensions:
                full_path = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(full_path, root_dir)
                file_locations[filename].append(rel_path)
    
    # Detectar duplicados
    for filename, paths in file_locations.items():
        if len(paths) > 1:
            issues.append({
                'type': 'Duplicado',
                'file': filename,
                'paths': paths,
                'severity': 'Importante',
                'tag': 'important',
                'suggestion': f'Archivo duplicado en {len(paths)} ubicaciones. Consolidar en una sola.'
            })
    
    return issues

def find_undocumented_components(root_dir: str, catalog_path: str) -> list[dict]:
    """
    Encuentra componentes que existen pero no están en el catálogo de diseño.
    """
    issues = []
    
    # Leer el catálogo si existe
    # Leer el catálogo si existe
    catalog_content = ""
    if os.path.exists(catalog_path):
        with open(catalog_path, 'r', encoding='utf-8', errors='ignore') as f:
            catalog_content = f.read()

    # Leer también los subcomponentes del catálogo (la carpeta DesignSystemCatalog)
    # Definimos la ruta de la carpeta asumiendo que está al lado del archivo principal
    catalog_dir = os.path.splitext(catalog_path)[0] # '.../DesignSystemCatalog'
    if os.path.exists(catalog_dir) and os.path.isdir(catalog_dir):
        for filename in os.listdir(catalog_dir):
            if filename.endswith('.tsx'):
                submod_path = os.path.join(catalog_dir, filename)
                with open(submod_path, 'r', encoding='utf-8', errors='ignore') as f:
                    catalog_content += f.read()
    
    # Componentes en molecules/
    molecules_dir = os.path.join(root_dir, 'frontend', 'src', 'components', 'molecules')
    if os.path.exists(molecules_dir):
        for filename in os.listdir(molecules_dir):
            if filename.endswith('.tsx') and filename != 'index.ts':
                component_name = filename.replace('.tsx', '')
                # Buscar si está documentado en el catálogo
                if component_name not in catalog_content:
                    issues.append({
                        'type': 'Sin Documentar',
                        'file': filename,
                        'path': os.path.join('molecules', filename),
                        'severity': 'Leve',
                        'tag': 'minor',
                        'suggestion': f'Componente {component_name} no está en DesignSystemCatalog.tsx'
                    })
    
    return issues

def find_unused_exports(index_path: str, components_dir: str) -> list[dict]:
    """
    Encuentra exports en index.ts que no corresponden a archivos existentes.
    """
    issues = []
    
    if not os.path.exists(index_path):
        return issues
    
    with open(index_path, 'r', encoding='utf-8', errors='ignore') as f:
        index_content = f.read()
    
    # Buscar patrones de export
    export_pattern = re.compile(r"export\s+\{[^}]+\}\s+from\s+['\"]\.\/([^'\"]+)['\"]")
    default_pattern = re.compile(r"export\s+\{\s*default\s+as\s+\w+\s*\}\s+from\s+['\"]\.\/([^'\"]+)['\"]")
    
    exports = export_pattern.findall(index_content) + default_pattern.findall(index_content)
    
    for export_file in exports:
        # Agregar extensión si no tiene
        if not export_file.endswith(('.tsx', '.ts')):
            export_file_tsx = export_file + '.tsx'
            export_file_ts = export_file + '.ts'
        else:
            export_file_tsx = export_file
            export_file_ts = export_file
        
        full_path_tsx = os.path.join(components_dir, export_file_tsx)
        full_path_ts = os.path.join(components_dir, export_file_ts)
        
        if not os.path.exists(full_path_tsx) and not os.path.exists(full_path_ts):
            issues.append({
                'type': 'Export Huérfano',
                'file': 'index.ts',
                'path': index_path,
                'severity': 'Importante',
                'tag': 'important',
                'suggestion': f'Export de "{export_file}" pero el archivo no existe.'
            })
    
    return issues
