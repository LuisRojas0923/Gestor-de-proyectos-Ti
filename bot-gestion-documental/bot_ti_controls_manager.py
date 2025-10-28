"""
Bot TI Controls Manager - Gestión de Controles TI
================================================

Módulo para gestionar la copia de documentación a carpetas de controles TI
y validar el cumplimiento basado en la presencia de archivos en las rutas destino.
"""

import os
import shutil
from datetime import datetime
from typing import List, Dict, Any, Callable, Tuple
from tkinter import messagebox


class TIControlsManager:
    """Gestor de controles TI para copia de documentación"""
    
    def __init__(self, base_path: str, logger: Callable[[str], None]):
        self.base_path = base_path
        self._log = logger
        
        # Rutas base de controles TI
        self.ti_base_path = "\\\\cdpwin211\\Controles TI"
        
        # Definir controles TI con sus documentos requeridos
        self.ti_controls = {
            "C003-GT": {
                "name": "Documento de entendimiento entre el colaborador y el proveedor",
                "destination": "C003-GT - Documento de entendimiento entre el colaborador y el proveedor",
                "documents": [
                    "FD-FT-284 Formato de requerimiento de necesidades",
                    "Correo electrónico en caso de novedad"
                ]
            },
            "C004-GT": {
                "name": "Listado de desarrollos en Pruebas",
                "destination": "C004-GT - Listado de desarrollos en Pruebas",
                "documents": [
                    "Test de pruebas del desarrollo para nuevo desarrollo",
                    "Instructivo de pruebas del desarrollo",
                    "FD-FT-060 Formato Pruebas Aplicativo"
                ]
            },
            "C021-GT": {
                "name": "Certificación de la implementación adecuada del desarrollo al usuario solicitante",
                "destination": "C021-GT - Certificación de la implementación adecuada del desarrollo al usuario solicitante",
                "documents": [
                    "FD-FT-060 FORMATO PRUEBAS APLICATIVO",
                    "Test de Funcionamiento",
                    "Correo electrónico en caso de novedad"
                ]
            }
        }
    
    def get_destination_path(self, dev_id: str, control_code: str) -> str:
        """
        Generar ruta destino completa para un desarrollo y control
        
        Args:
            dev_id: ID del desarrollo
            control_code: Código del control (C003-GT, C004-GT, C021-GT)
            
        Returns:
            Ruta completa destino: \\\\cdpwin211\\Controles TI\\[CONTROL]\\[AÑO]\\[MES]\\[dev_id]
        """
        if control_code not in self.ti_controls:
            raise ValueError(f"Control {control_code} no válido")
        
        now = datetime.now()
        year = str(now.year)
        month = f"{now.month:02d}"
        
        control_destination = self.ti_controls[control_code]["destination"]
        
        return os.path.join(
            self.ti_base_path,
            control_destination,
            year,
            month,
            dev_id
        )
    
    def check_control_status(self, dev_id: str, control_code: str) -> Dict[str, Any]:
        """
        Verificar estado de un control para un desarrollo específico
        
        Args:
            dev_id: ID del desarrollo
            control_code: Código del control
            
        Returns:
            Diccionario con estado del control
        """
        if control_code not in self.ti_controls:
            return {
                'status': 'ERROR',
                'message': f'Control {control_code} no válido',
                'documents_found': [],
                'documents_missing': [],
                'is_complete': False
            }
        
        destination_path = self.get_destination_path(dev_id, control_code)
        required_docs = self.ti_controls[control_code]["documents"]
        
        # Verificar si la carpeta destino existe
        if not os.path.exists(destination_path):
            return {
                'status': 'NO_COPIED',
                'message': 'Archivos no copiados aún',
                'documents_found': [],
                'documents_missing': required_docs,
                'is_complete': False,
                'destination_path': destination_path
            }
        
        # Buscar documentos en la carpeta destino
        documents_found = []
        documents_missing = []
        
        try:
            for doc in required_docs:
                if self._search_file_in_folder(destination_path, doc):
                    documents_found.append(doc)
                else:
                    documents_missing.append(doc)
        except Exception as e:
            self._log(f"❌ Error verificando documentos para {dev_id} - {control_code}: {e}")
            return {
                'status': 'ERROR',
                'message': f'Error verificando documentos: {e}',
                'documents_found': [],
                'documents_missing': required_docs,
                'is_complete': False
            }
        
        is_complete = len(documents_missing) == 0
        
        return {
            'status': 'COMPLETE' if is_complete else 'PARTIAL',
            'message': 'Control completo' if is_complete else f'Faltan {len(documents_missing)} documentos',
            'documents_found': documents_found,
            'documents_missing': documents_missing,
            'is_complete': is_complete,
            'destination_path': destination_path
        }
    
    def copy_files_to_control(self, dev_id: str, control_code: str, 
                            source_files: List[str], overwrite: bool = False) -> Dict[str, Any]:
        """
        Copiar archivos de un desarrollo a la carpeta de control TI
        
        Args:
            dev_id: ID del desarrollo
            control_code: Código del control
            source_files: Lista de rutas de archivos fuente
            overwrite: Si sobrescribir archivos existentes
            
        Returns:
            Diccionario con resultado de la operación
        """
        try:
            # Obtener carpeta fuente del desarrollo
            source_folder = self._find_development_folder(dev_id)
            if not source_folder:
                return {
                    'success': False,
                    'message': f'No se encontró carpeta para desarrollo {dev_id}',
                    'files_copied': [],
                    'files_failed': []
                }
            
            # Crear carpeta destino
            destination_path = self.get_destination_path(dev_id, control_code)
            os.makedirs(destination_path, exist_ok=True)
            
            files_copied = []
            files_failed = []
            
            # Copiar cada archivo
            for source_file in source_files:
                try:
                    # Buscar archivo en la carpeta fuente
                    actual_source = self._find_file_in_folder(source_folder, source_file)
                    if not actual_source:
                        files_failed.append(f"{source_file} (no encontrado)")
                        continue
                    
                    # Nombre del archivo destino
                    filename = os.path.basename(actual_source)
                    dest_file = os.path.join(destination_path, filename)
                    
                    # Verificar si archivo ya existe
                    if os.path.exists(dest_file) and not overwrite:
                        files_failed.append(f"{source_file} (ya existe)")
                        continue
                    
                    # Copiar archivo
                    shutil.copy2(actual_source, dest_file)
                    files_copied.append(source_file)
                    self._log(f"✅ Copiado: {source_file} -> {dest_file}")
                    
                except Exception as e:
                    files_failed.append(f"{source_file} (error: {e})")
                    self._log(f"❌ Error copiando {source_file}: {e}")
            
            success = len(files_copied) > 0
            message = f"Copiados {len(files_copied)} de {len(source_files)} archivos"
            
            return {
                'success': success,
                'message': message,
                'files_copied': files_copied,
                'files_failed': files_failed,
                'destination_path': destination_path
            }
            
        except Exception as e:
            self._log(f"❌ Error en copia de archivos para {dev_id} - {control_code}: {e}")
            return {
                'success': False,
                'message': f'Error general: {e}',
                'files_copied': [],
                'files_failed': source_files
            }
    
    def validate_all_controls(self, developments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validar estado de todos los controles para una lista de desarrollos
        """
        from bot_ti_controls_helpers import TIControlsValidation
        validator = TIControlsValidation(self._log, self)
        return validator.validate_all_controls(developments)
    
    def _control_applies_to_stage(self, control_code: str, current_stage: str) -> bool:
        """Verificar si un control aplica para la etapa actual"""
        if current_stage == 'N/A' or not current_stage:
            return False
        
        # Definir etapas por control
        control_stages = {
            "C003-GT": ["Definición", "Análisis"],
            "C004-GT": ["Despliegue (Pruebas)", "Aprobación (Pase)", "Entrega a Producción"],
            "C021-GT": ["Desarrollo del Requerimiento", "Plan de Pruebas", "Ejecución de Pruebas"]
        }
        
        return current_stage in control_stages.get(control_code, [])
    
    def _can_copy_control(self, development: Dict[str, Any], control_code: str) -> bool:
        """Verificar si se puede copiar un control (tiene todos los documentos en origen)"""
        dev_id = development.get('id', '')
        required_docs = self.ti_controls[control_code]["documents"]
        
        # Buscar carpeta del desarrollo
        dev_folder = self._find_development_folder(dev_id)
        if not dev_folder:
            return False
        
        # Verificar que todos los documentos estén presentes
        for doc in required_docs:
            if not self._search_file_in_folder(dev_folder, doc):
                return False
        
        return True
    
    def _find_development_folder(self, dev_id: str) -> str:
        """Buscar carpeta del desarrollo"""
        from bot_ti_controls_helpers import TIControlsHelpers
        
        helpers = TIControlsHelpers(self._log)
        return helpers.find_development_folder(self.base_path, dev_id)
    
    def _search_file_in_folder(self, folder_path: str, filename: str) -> bool:
        """Buscar archivo en una carpeta (búsqueda flexible)"""
        from bot_ti_controls_helpers import TIControlsHelpers
        
        helpers = TIControlsHelpers(self._log)
        return helpers.search_file_in_folder(folder_path, filename)
    
    def _find_file_in_folder(self, folder_path: str, filename: str) -> str:
        """Buscar archivo en una carpeta y retornar ruta completa"""
        from bot_ti_controls_helpers import TIControlsHelpers
        
        helpers = TIControlsHelpers(self._log)
        return helpers.find_file_in_folder(folder_path, filename)
