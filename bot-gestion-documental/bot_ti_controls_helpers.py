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
            
            # Normalizar nombres para comparación
            filename_lower = filename.lower().strip()
            
            # Buscar archivo exacto (sin extensión)
            file_base = os.path.splitext(filename)[0] if '.' in filename else filename
            if os.path.exists(os.path.join(folder_path, filename)) or os.path.exists(os.path.join(folder_path, file_base)):
                return True
            
            # Extraer palabras clave importantes (ignorar artículos y preposiciones comunes)
            ignore_words = {'de', 'del', 'la', 'el', 'en', 'caso', 'novedad', 'para', 'al', 'con', 'y', 'o'}
            keywords = [w.strip('-') for w in filename_lower.split() if w.strip('-') not in ignore_words and len(w.strip('-')) > 2]
            
            # Si no hay suficientes keywords, usar el texto completo pero dividido en partes
            if len(keywords) < 2:
                # Dividir por guiones y espacios para obtener partes significativas
                parts = [p.strip() for p in filename_lower.replace('-', ' ').split() if len(p.strip()) > 2]
                keywords = parts[:3]  # Tomar las primeras 3 partes más importantes
            
            # Buscar archivo con nombre similar (ignorando mayúsculas)
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    file_lower = file.lower()
                    
                    # Verificar si el texto completo está contenido
                    if filename_lower in file_lower:
                        return True
                    
                    # Verificar si todas las palabras clave importantes están presentes
                    if keywords:
                        found_keywords = sum(1 for kw in keywords if kw in file_lower)
                        # Si encontramos al menos el 70% de las palabras clave, consideramos coincidencia
                        if found_keywords >= max(1, len(keywords) * 0.7):
                            return True
                    
                    # Verificar código de formato (ej: FD-FT-284, FD-FT-060)
                    # Buscar patrones como "FD-FT-XXX" o "FD-FT-XXXX"
                    import re
                    format_code_pattern = r'fd-ft-\d+'
                    if re.search(format_code_pattern, filename_lower):
                        format_match = re.search(format_code_pattern, filename_lower)
                        if format_match and format_match.group() in file_lower:
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
            
            # Normalizar nombres para comparación
            filename_lower = filename.lower().strip()
            
            # Buscar archivo exacto
            exact_path = os.path.join(folder_path, filename)
            if os.path.exists(exact_path):
                return exact_path
            
            file_base = os.path.splitext(filename)[0] if '.' in filename else filename
            exact_base_path = os.path.join(folder_path, file_base)
            if os.path.exists(exact_base_path):
                return exact_base_path
            
            # Extraer palabras clave importantes (igual que en search_file_in_folder)
            ignore_words = {'de', 'del', 'la', 'el', 'en', 'caso', 'novedad', 'para', 'al', 'con', 'y', 'o'}
            keywords = [w.strip('-') for w in filename_lower.split() if w.strip('-') not in ignore_words and len(w.strip('-')) > 2]
            
            if len(keywords) < 2:
                parts = [p.strip() for p in filename_lower.replace('-', ' ').split() if len(p.strip()) > 2]
                keywords = parts[:3]
            
            # Buscar archivo con nombre similar (ignorando mayúsculas)
            best_match = None
            best_score = 0
            
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    file_lower = file.lower()
                    file_path = os.path.join(root, file)
                    
                    # Verificar si el texto completo está contenido
                    if filename_lower in file_lower:
                        return file_path
                    
                    # Calcular score basado en palabras clave
                    if keywords:
                        found_keywords = sum(1 for kw in keywords if kw in file_lower)
                        score = found_keywords / len(keywords) if keywords else 0
                        
                        # Verificar código de formato
                        import re
                        format_code_pattern = r'fd-ft-\d+'
                        if re.search(format_code_pattern, filename_lower):
                            format_match = re.search(format_code_pattern, filename_lower)
                            if format_match and format_match.group() in file_lower:
                                score += 0.5  # Bonus por código de formato
                        
                        if score > best_score and score >= 0.7:
                            best_score = score
                            best_match = file_path
            
            return best_match if best_match else ""
            
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
        optional_docs = self.manager.ti_controls[control_code].get("optional_documents", [])

        # Buscar carpeta del desarrollo
        dev_folder = self.manager._find_development_folder(dev_id)
        if not dev_folder:
            return False

        # Verificar que todos los documentos requeridos (no opcionales) estén presentes
        for doc in required_docs:
            if doc not in optional_docs:  # Solo verificar documentos no opcionales
                if not self.manager._search_file_in_folder(dev_folder, doc):
                    return False

        return True
