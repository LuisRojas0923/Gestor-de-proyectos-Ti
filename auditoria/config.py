"""
Configuración centralizada para la herramienta de auditoría.
"""
import os

# Carpetas a ignorar durante el escaneo
IGNORE_DIRS = {
    'node_modules', '.git', '__pycache__', 'venv', '.venv', 'env',
    '.idea', '.vscode', 'dist', 'build', 'coverage', 
    '.pytest_cache', 'z_backend_obsoleto_backup', 'auditoria'
}

# Extensiones de archivos a analizar
TARGET_EXTENSIONS = {
    '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css',
    '.java', '.c', '.cpp', '.h', '.sql', '.json',
    '.xml', '.yaml', '.yml', '.bat', '.sh', '.env'
}

# Archivos específicos a excluir (generados automáticamente)
EXCLUDE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'composer.lock', 'poetry.lock', 'Pipfile.lock',
    'pyvenv.cfg'
}

# Umbrales de advertencia
THRESHOLDS = {
    'lines_warning': 500,      # Amarillo
    'lines_critical': 1000,    # Rojo
    'imports_warning': 15,
    'complexity_warning': 30,
}

# Rutas del proyecto
def get_project_root():
    """Retorna el directorio raíz del proyecto (padre de auditoria/)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
