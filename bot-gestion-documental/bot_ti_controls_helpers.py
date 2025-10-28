"""
Bot TI Controls Helpers - Funciones auxiliares
==============================================

Funciones auxiliares para el módulo de gestión de controles TI.
"""

import os
from typing import Callable, List, Dict, Any


class TIControlsHelpers:
    """Funciones auxiliares para controles TI"""
    
    def __init__(self, logger: Callable[[str], None]):
        self._log = logger
    
    def find_development_folder(self, base_path: str, dev_id: str) -> str:
        """Buscar carpeta del desarrollo"""
        if not os.path.exists(base_path):
            return ""
        
        try:
            for root, dirs, files in os.walk(base_path):
                for dir_name in dirs:
                    if dev_id in dir_name:
                        return os.path.join(root, dir_name)
        except Exception as e:
            self._log(f"❌ Error buscando carpeta para {dev_id}: {e}")
        
        return ""
    
    def search_file_in_folder(self, folder_path: str, filename: str) -> bool:
        """Buscar archivo en una carpeta (búsqueda flexible)"""
        try:
            if not os.path.exists(folder_path):
                return False
            
            # Buscar archivo exacto
            if os.path.exists(os.path.join(folder_path, filename)):
                return True
            
            # Buscar archivo con nombre similar (ignorando mayúsculas)
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    if filename.lower() in file.lower():
                        return True
            
            return False
            
        except Exception as e:
            self._log(f"❌ Error buscando archivo {filename}: {e}")
            return False
    
    def find_file_in_folder(self, folder_path: str, filename: str) -> str:
        """Buscar archivo en una carpeta y retornar ruta completa"""
        try:
            if not os.path.exists(folder_path):
                return ""
            
            # Buscar archivo exacto
            exact_path = os.path.join(folder_path, filename)
            if os.path.exists(exact_path):
                return exact_path
            
            # Buscar archivo con nombre similar (ignorando mayúsculas)
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    if filename.lower() in file.lower():
                        return os.path.join(root, file)
            
            return ""
            
        except Exception as e:
            self._log(f"❌ Error buscando archivo {filename}: {e}")
            return ""


class TIControlsValidation:
    """Validador separado para reducir tamaño del manager"""

    def __init__(self, logger: Callable[[str], None], manager):
        self._log = logger
        self.manager = manager

    def validate_all_controls(self, developments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        self._log(f"🔍 Validando controles TI para {len(developments)} desarrollos...")

        results: List[Dict[str, Any]] = []
        for development in developments:
            dev_id = development.get('id', 'N/A')
            dev_name = development.get('name', 'N/A')
            stage = development.get('current_stage', 'N/A')

            # Obtener etapa de last_activity si current_stage no está disponible
            if stage == 'N/A':
                last_activity = development.get('last_activity')
                if last_activity and isinstance(last_activity, dict):
                    stage = last_activity.get('stage_name', 'N/A')

            dev_result: Dict[str, Any] = {
                'dev_id': dev_id,
                'dev_name': dev_name,
                'stage': stage,
                'controls_status': {},
                'can_copy_any': False
            }

            # Validar cada control
            for control_code in self.manager.ti_controls.keys():
                # Verificar si el control aplica para la etapa actual
                if self._control_applies_to_stage(control_code, stage):
                    control_status = self.manager.check_control_status(dev_id, control_code)
                    dev_result['controls_status'][control_code] = control_status

                    # Verificar si se puede copiar (tiene todos los documentos en origen)
                    if self._can_copy_control(development, control_code):
                        dev_result['can_copy_any'] = True
                        control_status['can_copy'] = True
                    else:
                        control_status['can_copy'] = False
                else:
                    dev_result['controls_status'][control_code] = {
                        'status': 'NO_APLICA',
                        'message': f'Control no aplica para etapa {stage}',
                        'can_copy': False
                    }

            results.append(dev_result)

        self._log(f"✅ Validación de controles TI completada")
        return results

    def _control_applies_to_stage(self, control_code: str, current_stage: str) -> bool:
        if current_stage == 'N/A' or not current_stage:
            return False

        control_stages = {
            "C003-GT": ["Definición", "Análisis"],
            "C004-GT": ["Despliegue (Pruebas)", "Aprobación (Pase)", "Entrega a Producción"],
            "C021-GT": ["Desarrollo del Requerimiento", "Plan de Pruebas", "Ejecución de Pruebas"]
        }

        return current_stage in control_stages.get(control_code, [])

    def _can_copy_control(self, development: Dict[str, Any], control_code: str) -> bool:
        dev_id = development.get('id', '')
        required_docs = self.manager.ti_controls[control_code]["documents"]

        # Buscar carpeta del desarrollo
        dev_folder = self.manager._find_development_folder(dev_id)
        if not dev_folder:
            return False

        # Verificar que todos los documentos estén presentes
        for doc in required_docs:
            if not self.manager._search_file_in_folder(dev_folder, doc):
                return False

        return True
