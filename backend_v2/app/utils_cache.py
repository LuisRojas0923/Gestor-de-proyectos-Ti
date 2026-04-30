import time
import json
import logging
from typing import Any, Optional, Dict
import redis
from .config import config

logger = logging.getLogger(__name__)

class SmartCache:
    """
    Cache inteligente que usa Redis como motor principal y 
    degrada a memoria local (RAM) si Redis no está disponible.
    """
    def __init__(self, default_ttl: int = 30):
        self.default_ttl = default_ttl
        self._local_cache: Dict[str, Dict[str, Any]] = {}
        self._redis_client = None
        self._redis_enabled = False
        
        try:
            # Intentamos conectar a Redis
            self._redis_client = redis.from_url(config.redis_url, decode_responses=True)
            self._redis_client.ping()
            self._redis_enabled = True
            logger.info("✅ Conectado exitosamente a Redis para cache.")
        except Exception as e:
            logger.warning(f"⚠️ Redis no disponible: {e}. Usando cache en memoria local (Fallback).")

    def get(self, key: str) -> Optional[Any]:
        # 1. Intentar con Redis
        if self._redis_enabled:
            try:
                val = self._redis_client.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.error(f"❌ Error leyendo de Redis: {e}")
        
        # 2. Fallback a Cache Local
        if key in self._local_cache:
            item = self._local_cache[key]
            if time.time() < item['expires']:
                return item['value']
            del self._local_cache[key]
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        ttl = ttl if ttl is not None else self.default_ttl
        
        # 1. Intentar persistir en Redis (requiere serialización)
        if self._redis_enabled:
            try:
                # Solo serializamos si es posible, si no, ignoramos Redis para este objeto
                serialized_val = json.dumps(value)
                self._redis_client.set(key, serialized_val, ex=ttl)
                return
            except (TypeError, ValueError):
                # Si no es serializable (ej. objeto complejo), usamos cache local solamente
                pass
            except Exception as e:
                logger.error(f"❌ Error escribiendo en Redis: {e}")

        # 2. Guardar en Cache Local
        self._local_cache[key] = {
            'value': value,
            'expires': time.time() + ttl
        }

    def clear(self):
        if self._redis_enabled:
            try:
                self._redis_client.flushdb()
            except Exception:
                pass
        self._local_cache.clear()

# Instancia global compatible con el código existente
global_cache = SmartCache(default_ttl=30)
