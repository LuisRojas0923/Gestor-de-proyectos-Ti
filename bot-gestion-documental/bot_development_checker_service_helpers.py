"""
Bot Development Checker Service Helpers - Funciones auxiliares para servicio
=======================================================================

Funciones auxiliares para reducir el tamaño de bot_development_checker.py.
"""

import requests
from typing import List, Dict, Any, Callable


class DevelopmentCheckerServiceHelpers:
    """Funciones auxiliares para el servicio de desarrollos"""
    
    def __init__(self, logger: Callable[[str], None]):
        self._log = logger
    
    def get_developments_from_service(self) -> List[str]:
        """Obtener IDs de desarrollos desde el servicio"""
        try:
            response = requests.get("http://localhost:8000/api/v1/developments", timeout=30)
            if response.status_code == 200:
                data = response.json()
                dev_ids = [dev.get('id', '') for dev in data if dev.get('id')]
                self._log(f"📊 Obtenidos {len(dev_ids)} desarrollos del servicio")
                return dev_ids
            else:
                self._log(f"❌ Error en servicio: {response.status_code}")
                return []
        except Exception as e:
            self._log(f"❌ Error obteniendo desarrollos del servicio: {e}")
            return []
    
    def get_developments_from_service_with_details(self) -> List[Dict[str, Any]]:
        """Obtener desarrollos completos desde el servicio"""
        try:
            response = requests.get("http://localhost:8000/api/v1/developments", timeout=30)
            if response.status_code == 200:
                data = response.json()
                self._log(f"📊 Obtenidos {len(data)} desarrollos del servicio")
                return data
            else:
                self._log(f"❌ Error en servicio: {response.status_code}")
                return []
        except Exception as e:
            self._log(f"❌ Error obteniendo desarrollos del servicio: {e}")
            return []
