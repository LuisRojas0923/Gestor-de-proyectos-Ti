"""
Schemas Pydantic del Sistema de Gestión de Proyectos TI
"""

# Importar todos los schemas
from .auth import *
from .development import *
from .quality import *
from .kpi import *
from .alerts import *
from .chat import *
from .ai import *
from .mcp import *

# Mantener compatibilidad con schemas legacy
from .legacy import *
