"""
Patrones de auditoría de seguridad (ISO 25010).
Detecta vulnerabilidades comunes como hardcoded secrets y SQL injection.
"""
import re

# Patrones de seguridad
SECURITY_PATTERNS = {
    'Seguridad: Hardcoded Secrets': re.compile(
        r'(?i)(password|secret|api_key|token|access_key)\s*=\s*["\'][^"\']+["\']'
    ),
    'Seguridad: SQL Injection (f-string)': re.compile(
        r'(?i)(execute|query|cursor\.execute)\s*\(\s*f["\'].*\{.+\}.*["\']'
    ),
    'Seguridad: SQL Injection (Concat)': re.compile(
        r'(?i)(execute|query|cursor\.execute)\s*\(.+\s*\+\s*.+\)'
    ),
}

# Patrones de fiabilidad
RELIABILITY_PATTERNS = {
    'Fiabilidad: API/DB Sin Control': re.compile(
        r'(?i)(\.execute\(|fetch\(|axios\.|http\.|request\()'
    ),
}

def get_all_security_patterns():
    """Retorna todos los patrones de seguridad."""
    return SECURITY_PATTERNS

def get_all_reliability_patterns():
    """Retorna todos los patrones de fiabilidad."""
    return RELIABILITY_PATTERNS

def get_security_suggestion(pattern_name: str) -> tuple[str, str, str]:
    """Retorna (severidad, tag, sugerencia) para patrones de seguridad."""
    if 'Hardcoded' in pattern_name:
        return ('Crítico', 'critical', '¡RIESGO DE SEGURIDAD! Usar variables de entorno (.env).')
    elif 'SQL Injection' in pattern_name:
        return ('Crítico', 'critical', 'Posible SQL Injection. Usar consultas parametrizadas.')
    return ('Crítico', 'critical', 'Revisar vulnerabilidad de seguridad.')

def get_reliability_suggestion(pattern_name: str) -> tuple[str, str, str]:
    """Retorna (severidad, tag, sugerencia) para patrones de fiabilidad."""
    return ('Importante', 'important', 'Verificar manejo de errores (bloques try/catch o .catch).')
