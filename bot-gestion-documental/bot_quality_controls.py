"""
Bot Quality Controls - Módulo de Controles de Calidad
====================================================

Módulo para gestionar y validar controles de calidad de desarrollos.
"""

import os
import re
from typing import List, Dict, Any, Callable
from datetime import datetime


class QualityControlValidator:
    """Validador de controles de calidad para desarrollos"""
    
    def __init__(self, base_path: str, logger: Callable[[str], None]):
        self.base_path = base_path
        self._log = logger
        
        # Definir controles de calidad
        self.controls = {
            "C003-GT": {
                "name": "Documento de entendimiento entre el colaborador y el proveedor",
                "description": "Verificar que los requerimientos estén claramente definidos, sean completos y cumplan con los estándares de calidad establecidos.",
                "stages": ["Definición", "Análisis"],
                "deliverables": [
                    "FD-FT-284 Formato de requerimiento de necesidades",
                    "Correo electrónico en caso de novedad"
                ],
                "validation_criteria": "Requerimientos claros, completos, aprobados por el área solicitante",
                "ti_destination": "\\\\cdpwin211\\Controles TI\\C003-GT - Documento de entendimiento entre el colaborador y el proveedor"
            },
            "C004-GT": {
                "name": "Listado de desarrollos en Pruebas",
                "description": "Asegurar que las entregas no generen impactos negativos en el sistema o procesos existentes.",
                "stages": ["Despliegue (Pruebas)", "Aprobación (Pase)", "Entrega a Producción"],
                "deliverables": [
                    "Test de pruebas del desarrollo para nuevo desarrollo",
                    "Instructivo de pruebas del desarrollo",
                    "FD-FT-060 Formato Pruebas Aplicativo"
                ],
                "validation_criteria": "Despliegue exitoso, pruebas de regresión aprobadas, certificación de ambiente",
                "ti_destination": "\\\\cdpwin211\\Controles TI\\C004-GT - Listado de desarrollos en Pruebas"
            },
            "C021-GT": {
                "name": "Certificación de la implementación adecuada del desarrollo al usuario solicitante",
                "description": "Verificar que las pruebas de usuario estén alineadas con los requerimientos definidos y que cubran todos los casos de uso.",
                "stages": ["Desarrollo del Requerimiento", "Plan de Pruebas", "Ejecución de Pruebas"],
                "deliverables": [
                    "FD-FT-060 FORMATO PRUEBAS APLICATIVO",
                    "Test de Funcionamiento",
                    "Correo electrónico en caso de novedad"
                ],
                "validation_criteria": "Pruebas ejecutadas exitosamente, casos de prueba cubren todos los requerimientos, evidencia de aprobación del usuario",
                "ti_destination": "\\\\cdpwin211\\Controles TI\\C021-GT - Certificación de la implementación adecuada del desarrollo al usuario solicitante"
            }
        }
    
    def validate_development_controls(self, development: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validar controles de calidad para un desarrollo específico
        
        Args:
            development: Diccionario con información del desarrollo
            
        Returns:
            Diccionario con resultados de validación
        """
        dev_id = development.get('id', 'N/A')
        dev_name = development.get('name', 'N/A')
        stage = development.get('current_stage', 'N/A')
        
        # Obtener etapa de last_activity si current_stage no está disponible
        if stage == 'N/A':
            last_activity = development.get('last_activity')
            if last_activity and isinstance(last_activity, dict):
                stage = last_activity.get('stage_name', 'N/A')
        
        self._log(f"🔍 Validando controles para {dev_id}: {dev_name}")
        self._log(f"   Etapa actual: {stage}")
        
        validation_results = {
            'dev_id': dev_id,
            'dev_name': dev_name,
            'stage': stage,
            'controls_status': {},
            'overall_status': 'PENDIENTE',
            'missing_deliverables': [],
            'recommendations': []
        }
        
        # Validar cada control
        for control_code, control_info in self.controls.items():
            control_result = self._validate_single_control(
                development, control_code, control_info, stage
            )
            validation_results['controls_status'][control_code] = control_result
        
        # Determinar estado general
        validation_results['overall_status'] = self._determine_overall_status(
            validation_results['controls_status']
        )
        
        # Generar recomendaciones
        validation_results['recommendations'] = self._generate_recommendations(
            validation_results['controls_status'], stage
        )
        
        return validation_results
    
    def _validate_single_control(self, development: Dict[str, Any], 
                                control_code: str, control_info: Dict[str, Any], 
                                current_stage: str) -> Dict[str, Any]:
        """Validar un control específico"""
        
        # Verificar si el control aplica para la etapa actual
        applies_to_stage = self._control_applies_to_stage(control_code, current_stage)
        
        if not applies_to_stage:
            return {
                'status': 'NO_APLICA',
                'reason': f'Control no aplica para etapa {current_stage}',
                'deliverables_found': [],
                'deliverables_missing': [],
                'validation_passed': False
            }
        
        # Buscar entregables en la carpeta del desarrollo
        deliverables_found = self._find_deliverables(development, control_info['deliverables'])
        deliverables_missing = self._get_missing_deliverables(
            control_info['deliverables'], deliverables_found
        )
        
        # Determinar si el control pasa
        validation_passed = len(deliverables_missing) == 0
        
        return {
            'status': 'APLICA' if applies_to_stage else 'NO_APLICA',
            'reason': 'Control aplica para esta etapa' if applies_to_stage else f'Control no aplica para etapa {current_stage}',
            'deliverables_found': deliverables_found,
            'deliverables_missing': deliverables_missing,
            'validation_passed': validation_passed,
            'validation_criteria': control_info['validation_criteria']
        }
    
    def _control_applies_to_stage(self, control_code: str, current_stage: str) -> bool:
        """Verificar si un control aplica para la etapa actual"""
        
        if current_stage == 'N/A' or not current_stage:
            return False
        
        control_stages = self.controls[control_code]['stages']
        
        # Verificar si la etapa actual está en las etapas del control
        return current_stage in control_stages
    
    def _find_deliverables(self, development: Dict[str, Any], 
                          deliverables: List[str]) -> List[str]:
        """Buscar entregables en la carpeta del desarrollo"""
        
        dev_id = development.get('id', '')
        found_deliverables = []
        
        # Buscar carpeta del desarrollo
        dev_folder = self._find_development_folder(dev_id)
        
        if not dev_folder:
            return found_deliverables
        
        try:
            # Buscar cada entregable en la carpeta
            for deliverable in deliverables:
                if self._search_file_in_folder(dev_folder, deliverable):
                    found_deliverables.append(deliverable)
        except Exception as e:
            self._log(f"❌ Error buscando entregables para {dev_id}: {e}")
        
        return found_deliverables
    
    def _find_development_folder(self, dev_id: str) -> str:
        """Buscar carpeta del desarrollo"""
        
        if not os.path.exists(self.base_path):
            return ""
        
        try:
            for root, dirs, files in os.walk(self.base_path):
                for dir_name in dirs:
                    if dev_id in dir_name:
                        return os.path.join(root, dir_name)
        except Exception as e:
            self._log(f"❌ Error buscando carpeta para {dev_id}: {e}")
        
        return ""
    
    def _search_file_in_folder(self, folder_path: str, filename: str) -> bool:
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
    
    def _get_missing_deliverables(self, required_deliverables: List[str], 
                                 found_deliverables: List[str]) -> List[str]:
        """Obtener entregables faltantes"""
        
        missing = []
        for deliverable in required_deliverables:
            if deliverable not in found_deliverables:
                missing.append(deliverable)
        
        return missing
    
    def _determine_overall_status(self, controls_status: Dict[str, Any]) -> str:
        """Determinar estado general de validación"""
        
        applicable_controls = [status for status in controls_status.values() 
                              if status['status'] == 'APLICA']
        
        if not applicable_controls:
            return 'NO_APLICA'
        
        passed_controls = [status for status in applicable_controls 
                          if status['validation_passed']]
        
        if len(passed_controls) == len(applicable_controls):
            return 'COMPLETO'
        elif len(passed_controls) > 0:
            return 'PARCIAL'
        else:
            return 'PENDIENTE'
    
    def _generate_recommendations(self, controls_status: Dict[str, Any], 
                                current_stage: str) -> List[str]:
        """Generar recomendaciones basadas en el estado de los controles"""
        
        recommendations = []
        
        for control_code, status in controls_status.items():
            if status['status'] == 'APLICA':
                if not status['validation_passed']:
                    missing = status['deliverables_missing']
                    if missing:
                        recommendations.append(
                            f"Para {control_code}: Entregar {', '.join(missing)}"
                        )
                else:
                    recommendations.append(f"✅ {control_code}: Completado")
            else:
                recommendations.append(f"⏸️ {control_code}: No aplica para etapa {current_stage}")
        
        return recommendations
    
    def validate_multiple_developments(self, developments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validar controles para múltiples desarrollos"""
        
        self._log(f"🔍 Validando controles para {len(developments)} desarrollos...")
        
        results = []
        for development in developments:
            try:
                result = self.validate_development_controls(development)
                results.append(result)
            except Exception as e:
                self._log(f"❌ Error validando {development.get('id', 'N/A')}: {e}")
                continue
        
        # Generar resumen
        self._generate_validation_summary(results)
        
        return results
    
    def _generate_validation_summary(self, results: List[Dict[str, Any]]):
        """Generar resumen de validación"""
        from bot_quality_controls_helpers import QualityControlHelpers
        
        helpers = QualityControlHelpers(self._log)
        helpers.generate_validation_summary(results)
