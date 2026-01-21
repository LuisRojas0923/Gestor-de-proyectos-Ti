"""
Scanner de auditoría de seguridad (ISO 25010).
"""
import os
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
            if ext not in ['.py', '.tsx', '.jsx', '.ts', '.js']:
                continue
            
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_dir)
            
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                
                for line_num, line_text in enumerate(lines, 1):
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

def scan_reliability_issues(root_dir: str) -> list[dict]:
    """Escanea archivos buscando problemas de fiabilidad."""
    issues = []
    patterns = get_all_reliability_patterns()
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        
        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in ['.py', '.tsx', '.jsx', '.ts', '.js']:
                continue
            
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_dir)
            
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                
                for line_num, line_text in enumerate(lines, 1):
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
