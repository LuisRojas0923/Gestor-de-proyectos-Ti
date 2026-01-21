"""
Patrones de auditoría del sistema de diseño.
Detecta uso de etiquetas nativas, estilos inline, componentes legacy.
"""
import re

# Patrones de etiquetas nativas (deberían usar átomos)
NATIVE_TAGS = {
    'Nativo: <button>': re.compile(r'<button\b'),
    'Nativo: <input>': re.compile(r'<input\b'),
    'Nativo: <select>': re.compile(r'<select\b'),
    'Nativo: <textarea>': re.compile(r'<textarea\b'),
    'Nativo: <h1>-<h6>': re.compile(r'<h[1-6]\b'),
    'Nativo: <p>': re.compile(r'<p\b'),
    'Nativo: <span>': re.compile(r'<span\b'),
    'Nativo: <label>': re.compile(r'<label\b'),
    'Nativo: <b> / <i>': re.compile(r'<(b|i)\b'),
    'Nativo: <input type="submit">': re.compile(r'<input\b[^>]*type=["\'](?:submit|button)["\']'),
    'Nativo: class="btn"': re.compile(r'class(?:Name)?=["\'].*\bbtn\b.*["\']'),
}

# Patrones de estilos inline
INLINE_STYLES = {
    'Estilo Inline': re.compile(r'style=\{\{'),
}

# Componentes legacy a migrar
LEGACY_COMPONENTS = {
    'Legacy: MaterialButton': re.compile(r'MaterialButton\b'),
    'Legacy: MaterialTextField': re.compile(r'MaterialTextField\b'),
    'Legacy: MaterialSelect': re.compile(r'MaterialSelect\b'),
}

# Excepciones: archivos donde ciertos patrones son permitidos
EXCEPTIONS = {
    'atoms/button.tsx': ['Nativo: <button>'],
    'atoms/input.tsx': ['Nativo: <input>'],
    'atoms/select.tsx': ['Nativo: <select>'],
    'atoms/textarea.tsx': ['Nativo: <textarea>'],
    'atoms/checkbox.tsx': ['Nativo: <input>'],
    'atoms/switch.tsx': ['Nativo: <input>'],
}

def get_all_design_patterns():
    """Retorna todos los patrones de diseño combinados."""
    return {**NATIVE_TAGS, **INLINE_STYLES, **LEGACY_COMPONENTS}

def is_exception(file_path: str, pattern_name: str) -> bool:
    """Verifica si un archivo tiene excepción para un patrón específico."""
    path_lower = file_path.lower().replace('\\', '/')
    for exception_path, allowed_patterns in EXCEPTIONS.items():
        if exception_path in path_lower and pattern_name in allowed_patterns:
            return True
    return False

def get_suggestion(pattern_name: str, file_path: str) -> tuple[str, str, str]:
    """
    Retorna (severidad, tag, sugerencia) para un patrón detectado.
    """
    path_lower = file_path.lower().replace('\\', '/')
    
    # Estilos inline
    if 'Estilo Inline' in pattern_name:
        return ('Importante', 'important', 'Evitar deuda técnica visual. Usar clases o tokens de diseño.')
    
    # En átomos es crítico
    if 'atoms/' in path_lower:
        return ('Crítico', 'critical', '¡PROHIBIDO! Los átomos no deben usar tags nativos.')
    
    # Legacy components
    if 'Legacy' in pattern_name:
        return ('Importante', 'legacy', 'Migrar componente legacy a Átomo moderno.')
    
    # En páginas es leve
    if 'pages/' in path_lower:
        return ('Leve', 'minor', 'Deuda técnica. Considerar abstraer a componentes/moléculas.')
    
    # Sugerencias específicas por tipo
    suggestions = {
        'button': 'Usar <Button /> (Átomo)',
        'input': 'Usar <Input /> (Átomo)',
        'select': 'Usar <Select /> (Átomo)',
        'textarea': 'Usar <Textarea /> (Átomo)',
        '<h1>-<h6>': 'Usar <Title /> o <Subtitle /> (Átomo)',
        '<p>': 'Usar <Text /> (Átomo)',
        '<span>': 'Usar <Text /> (Átomo)',
        '<label>': 'Usar <Text /> (Átomo)',
        '<b> / <i>': "Usar <Text weight='bold' /> o similar",
    }
    
    for key, suggestion in suggestions.items():
        if key in pattern_name.lower():
            return ('Leve', 'minor', suggestion)
    
    return ('Leve', 'minor', 'Usar componentes del sistema de diseño.')
