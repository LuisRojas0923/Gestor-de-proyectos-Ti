# Namespace package for legacy imports
import os
_backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend_v2', 'app'))
if _backend_path not in __path__:
    __path__.append(_backend_path)
