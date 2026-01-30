"""
Utilidad de Cache simple en memoria para Backend V2
"""
import time
from typing import Any, Optional, Dict

class SimpleCache:
    def __init__(self, default_ttl: int = 30):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            item = self._cache[key]
            if time.time() < item['expires']:
                return item['value']
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        ttl = ttl if ttl is not None else self.default_ttl
        self._cache[key] = {
            'value': value,
            'expires': time.time() + ttl
        }

    def clear(self):
        self._cache.clear()

# Instancia global para ser usada en los routers
global_cache = SimpleCache(default_ttl=30)
