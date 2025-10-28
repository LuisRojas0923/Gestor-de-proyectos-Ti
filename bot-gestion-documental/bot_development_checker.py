"""
Bot Development Checker - Verificador de archivos en desarrollos
===============================================================

Módulo para verificar que cada desarrollo tenga los archivos requeridos
según los controles TI aplicables.
"""

import os
import re
from typing import List, Dict, Any, Callable
from datetime import datetime
from bot_ti_controls_manager import TIControlsManager
from bot_development_checker_service_helpers import DevelopmentCheckerServiceHelpers


class DevelopmentChecker:
    """Verificador de archivos requeridos en desarrollos"""
    
    def __init__(self, base_path: str, logger: Callable[[str], None]):
        self.base_path = base_path
        self._log = logger
        self.ti_manager = TIControlsManager(base_path, logger)
        self.service_helpers = DevelopmentCheckerServiceHelpers(logger)
    
    def get_developments_from_service(self) -> List[str]:
        """Obtener IDs de desarrollos desde el servicio"""
        return self.service_helpers.get_developments_from_service()
    
    def get_developments_from_service_with_details(self) -> List[Dict[str, Any]]:
        """Obtener desarrollos completos desde el servicio"""
        return self.service_helpers.get_developments_from_service_with_details()
    
    def check_all_developments(self, filter_by_service: bool = False) -> List[Dict[str, Any]]:
        """
        Verificar archivos requeridos en todos los desarrollos
        
        Args:
            filter_by_service: Si True, solo verificar desarrollos que estén en el servicio
        
        Returns:
            Lista de resultados de verificación por desarrollo
        """
        self._log("🔍 Iniciando verificación de archivos en desarrollos...")
        
        # Obtener desarrollos del servicio
        service_developments = self.get_developments_from_service_with_details()
        
        if filter_by_service and not service_developments:
            self._log("⚠️ No se pudieron obtener desarrollos del servicio")
            return []
        
        # Obtener todas las carpetas de desarrollos físicas
        development_folders = self._get_development_folders()
        folder_map = {}
        for folder_path in development_folders:
            folder_name = os.path.basename(folder_path)
            dev_id = self._extract_dev_id_from_folder(folder_name)
            if dev_id:
                folder_map[dev_id] = {
                    'path': folder_path,
                    'name': folder_name,
                    'phase': os.path.basename(os.path.dirname(folder_path))
                }
        
        results = []
        
        # Si filtro por servicio, usar solo desarrollos del servicio
        if filter_by_service:
            for dev in service_developments:
                dev_id = dev.get('id', '')
                if dev_id in folder_map:
                    # Desarrollo tiene carpeta física
                    folder_info = folder_map[dev_id]
                    result = self._check_single_development(
                        dev_id, folder_info['path'], folder_info['name'], folder_info['phase']
                    )
                    results.append(result)
        else:
            # Mostrar todos los desarrollos del servicio, con o sin carpeta
            for dev in service_developments:
                dev_id = dev.get('id', '')
                name = dev.get('name', 'N/A')
                stage = dev.get('current_stage', 'N/A')
                
                if dev_id in folder_map:
                    # Desarrollo tiene carpeta física
                    folder_info = folder_map[dev_id]
                    result = self._check_single_development(
                        dev_id, folder_info['path'], folder_info['name'], folder_info['phase']
                    )
                else:
                    # Desarrollo sin carpeta física
                    result = {
                        'dev_id': dev_id,
                        'folder_name': f"{dev_id}_{name}",
                        'folder_path': "No encontrada",
                        'phase': stage,
                        'controls_status': {},
                        'overall_status': 'NO_FOLDER',
                        'total_files_found': 0,
                        'total_files_required': 0,
                        'can_copy_any': False
                    }
                
                results.append(result)
        
        self._log(f"✅ Verificación completada: {len(results)} desarrollos procesados")
        return results
    
    def _get_development_folders(self) -> List[str]:
        """Obtener lista de carpetas de desarrollos (buscar en todas las fases)"""
        folders = []
        
        try:
            # Buscar en todas las fases
            for phase_folder in os.listdir(self.base_path):
                phase_path = os.path.join(self.base_path, phase_folder)
                if os.path.isdir(phase_path):
                    # Buscar desarrollos dentro de cada fase
                    for dev_folder in os.listdir(phase_path):
                        dev_path = os.path.join(phase_path, dev_folder)
                        if os.path.isdir(dev_path):
                            folders.append(dev_path)
        except Exception as e:
            self._log(f"❌ Error listando carpetas: {e}")
        
        return folders
    
    def _extract_dev_id_from_folder(self, folder_name: str) -> str:
        """
        Extraer ID del desarrollo del nombre de la carpeta
        Busca patrones como: INC000004841295_Nombre, DEV-001, etc.
        """
        # Patrones comunes para IDs de desarrollo
        patterns = [
            r'INC(\d+)',       # INC000004841295_Nombre
            r'DEV[-_]?(\d+)',  # DEV-001, DEV_001, DEV001
            r'^(\d+)[-_]',      # 001-Nombre, 001_Nombre
            r'^(\d+)$',        # Solo números
            r'(\d{3,})',       # Al menos 3 dígitos
        ]
        
        for pattern in patterns:
            match = re.search(pattern, folder_name, re.IGNORECASE)
            if match:
                return match.group(1) if len(match.groups()) > 0 else match.group(0)
        
        # Si no encuentra patrón, usar el nombre completo
        return folder_name
    
    def _check_single_development(self, dev_id: str, folder_path: str, folder_name: str, phase: str) -> Dict[str, Any]:
        """Verificar un desarrollo específico"""
        
        result = {
            'dev_id': dev_id,
            'folder_name': folder_name,
            'folder_path': folder_path,
            'phase': phase,
            'controls_status': {},
            'overall_status': 'UNKNOWN',
            'total_files_found': 0,
            'total_files_required': 0,
            'can_copy_any': False
        }
        
        # Verificar cada control TI
        for control_code in self.ti_manager.ti_controls.keys():
            control_result = self._check_control_for_development(
                dev_id, folder_path, control_code
            )
            result['controls_status'][control_code] = control_result
            
            # Contar archivos
            result['total_files_found'] += len(control_result.get('files_found', []))
            result['total_files_required'] += len(control_result.get('files_required', []))
            
            if control_result.get('can_copy', False):
                result['can_copy_any'] = True
        
        # Determinar estado general
        result['overall_status'] = self._determine_overall_status(result['controls_status'])
        
        return result
    
    def _check_control_for_development(self, dev_id: str, folder_path: str, control_code: str) -> Dict[str, Any]:
        """Verificar archivos requeridos para un control específico"""
        
        required_docs = self.ti_manager.ti_controls[control_code]["documents"]
        files_found = []
        files_missing = []
        
        # Buscar cada archivo requerido
        for doc in required_docs:
            if self._search_file_in_folder(folder_path, doc):
                files_found.append(doc)
            else:
                files_missing.append(doc)
        
        can_copy = len(files_missing) == 0
        
        return {
            'control_code': control_code,
            'control_name': self.ti_manager.ti_controls[control_code]["name"],
            'files_required': required_docs,
            'files_found': files_found,
            'files_missing': files_missing,
            'can_copy': can_copy,
            'completion_percentage': (len(files_found) / len(required_docs) * 100) if required_docs else 0
        }
    
    def _search_file_in_folder(self, folder_path: str, filename: str) -> bool:
        """Buscar archivo en una carpeta específica de desarrollo (búsqueda flexible)"""
        try:
            if not os.path.exists(folder_path):
                return False
            
            # Buscar archivo exacto
            exact_path = os.path.join(folder_path, filename)
            if os.path.exists(exact_path):
                return True
            
            # Buscar archivo con nombre similar (ignorando mayúsculas)
            # Solo en la carpeta del desarrollo, no recursivamente
            try:
                files = os.listdir(folder_path)
                for file in files:
                    if filename.lower() in file.lower():
                        return True
            except Exception:
                pass
            
            return False
            
        except Exception as e:
            self._log(f"❌ Error buscando archivo {filename} en {folder_path}: {e}")
            return False
    
    def _determine_overall_status(self, controls_status: Dict[str, Any]) -> str:
        """Determinar estado general del desarrollo"""
        
        if not controls_status:
            return 'NO_CONTROLS'
        
        total_controls = len(controls_status)
        complete_controls = sum(1 for status in controls_status.values() 
                               if status.get('can_copy', False))
        
        if complete_controls == total_controls:
            return 'COMPLETE'
        elif complete_controls > 0:
            return 'PARTIAL'
        else:
            return 'INCOMPLETE'
    
    def generate_summary_report(self, results: List[Dict[str, Any]]) -> str:
        """Generar reporte resumen de la verificación"""
        
        if not results:
            return "No hay desarrollos para verificar."
        
        total_devs = len(results)
        complete = sum(1 for r in results if r['overall_status'] == 'COMPLETE')
        partial = sum(1 for r in results if r['overall_status'] == 'PARTIAL')
        incomplete = sum(1 for r in results if r['overall_status'] == 'INCOMPLETE')
        
        report = f"""
📊 REPORTE DE VERIFICACIÓN DE DESARROLLOS
==========================================

📋 Total desarrollos verificados: {total_devs}
✅ Completos: {complete}
⚠️ Parciales: {partial}
❌ Incompletos: {incomplete}

📈 Porcentaje de cumplimiento: {(complete / total_devs * 100):.1f}%
        """
        
        # Agregar detalles de desarrollos con problemas
        problematic = [r for r in results if r['overall_status'] in ['PARTIAL', 'INCOMPLETE']]
        if problematic:
            report += "\n\n⚠️ DESARROLLOS CON PROBLEMAS:\n"
            for result in problematic[:10]:  # Mostrar solo los primeros 10
                report += f"• {result['dev_id']}: {result['folder_name']} - {result['overall_status']}\n"
        
        return report
