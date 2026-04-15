import subprocess
import os
from ..config import IGNORE_DIRS, TARGET_EXTENSIONS

def get_files_to_scan(root_dir, incremental=False):
    """
    Obtiene la lista de archivos a escanear.
    Si incremental=True, usa 'git status' para obtener solo archivos modificados.
    """
    files = []
    
    if incremental:
        try:
            # Archivos en staged (modificados o nuevos listos para commit)
            result = subprocess.run(
                ["git", "diff", "--name-only", "--cached"],
                cwd=root_dir,
                capture_output=True,
                text=True,
                check=True
            )
            staged_files = result.stdout.splitlines()
            
            # Archivos modificados pero no en staged
            result_unstaged = subprocess.run(
                ["git", "diff", "--name-only"],
                cwd=root_dir,
                capture_output=True,
                text=True,
                check=True
            )
            unstaged_files = result_unstaged.stdout.splitlines()
            
            # Archivos nuevos no trackeados
            result_untracked = subprocess.run(
                ["git", "ls-files", "--others", "--exclude-standard"],
                cwd=root_dir,
                capture_output=True,
                text=True,
                check=True
            )
            untracked_files = result_untracked.stdout.splitlines()
            
            git_files = list(set(staged_files + unstaged_files + untracked_files))
            
            for f in git_files:
                full_path = os.path.join(root_dir, f)
                if os.path.isfile(full_path):
                    ext = os.path.splitext(f)[1].lower()
                    if ext in TARGET_EXTENSIONS or f in ['Dockerfile', '.dockerignore']:
                        # Verificar que no esté en una carpeta ignorada
                        if not any(ignored in f.split(os.sep) for ignored in IGNORE_DIRS):
                            files.append(full_path)
            
            print(f"Modo incremental: {len(files)} archivos detectados para escaneo.")
            return files
        except Exception as e:
            print(f"Error detectando archivos git (fallback a full scan): {e}")
            incremental = False

    # Full Scan fallback
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext in TARGET_EXTENSIONS or filename in ['Dockerfile', '.dockerignore']:
                files.append(os.path.join(dirpath, filename))
                
    return files
