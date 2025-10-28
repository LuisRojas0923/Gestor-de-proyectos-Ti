"""
Bot Actions - Módulo para manejar acciones y recomendaciones
==========================================================

Módulo para agrupar y ejecutar acciones de desarrollos.
"""

import os
import shutil
from typing import List, Dict, Any
from datetime import datetime


class ActionManager:
    """Manejador de acciones para desarrollos"""
    
    def __init__(self, base_path: str, log_callback=None):
        self.base_path = base_path
        self.log_callback = log_callback or print
    
    def _log(self, message: str):
        """Log con callback"""
        self.log_callback(message)
    
    def group_actions(self, suggestions: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Agrupar sugerencias por tipo de acción
        
        Args:
            suggestions: Lista de sugerencias
            
        Returns:
            Diccionario con acciones agrupadas
        """
        grouped = {
            "🆕 CREAR": [],
            "📁 ABRIR": [],
            "⏸️ PENDIENTE": []
        }
        
        for suggestion in suggestions:
            action = suggestion.get('action', '⏸️ PENDIENTE')
            if action in grouped:
                grouped[action].append(suggestion)
        
        return grouped
    
    def get_creatable_developments(self, suggestions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Obtener desarrollos que se pueden crear"""
        return [s for s in suggestions if s.get('action') == "🆕 CREAR" and s.get('can_process', True)]
    
    def get_movable_developments(self, suggestions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Obtener desarrollos que se pueden mover"""
        return [s for s in suggestions if s.get('action') == "📁 ABRIR" and s.get('can_process', True)]
    
    def execute_create_actions(self, developments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Ejecutar acciones de creación de carpetas
        
        Args:
            developments: Lista de desarrollos a crear
            
        Returns:
            Resultado de la ejecución
        """
        self._log("🆕 EJECUTANDO ACCIONES DE CREACIÓN")
        self._log("=" * 50)
        
        results = {
            'success': [],
            'errors': [],
            'total': len(developments)
        }
        
        for dev in developments:
            try:
                dev_id = dev.get('dev_id', 'N/A')
                name = dev.get('name', 'N/A')
                stage = dev.get('stage', 'N/A')
                
                # Crear nombre de carpeta
                folder_name = f"{dev_id}_{name}"
                # Limpiar caracteres inválidos
                folder_name = self._clean_folder_name(folder_name)
                
                # Determinar ruta de destino basada en la etapa
                target_path = self._get_target_path_for_stage(stage)
                full_path = os.path.join(target_path, folder_name)
                
                # Crear carpeta
                os.makedirs(full_path, exist_ok=True)
                
                results['success'].append({
                    'dev_id': dev_id,
                    'name': name,
                    'path': full_path
                })
                
                self._log(f"✅ CREADO: {dev_id} | {name}")
                self._log(f"   📁 Ruta: {full_path}")
                
            except Exception as e:
                results['errors'].append({
                    'dev_id': dev.get('dev_id', 'N/A'),
                    'name': dev.get('name', 'N/A'),
                    'error': str(e)
                })
                self._log(f"❌ ERROR: {dev.get('dev_id', 'N/A')} - {e}")
        
        # Resumen
        self._log(f"\n📊 RESUMEN DE CREACIÓN:")
        self._log(f"   ✅ Exitosos: {len(results['success'])}")
        self._log(f"   ❌ Errores: {len(results['errors'])}")
        self._log(f"   📋 Total: {results['total']}")
        
        return results
    
    def execute_move_actions(self, developments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Ejecutar acciones de movimiento de carpetas
        
        Args:
            developments: Lista de desarrollos a mover
            
        Returns:
            Resultado de la ejecución
        """
        self._log("📁 EJECUTANDO ACCIONES DE MOVIMIENTO")
        self._log("=" * 50)
        
        results = {
            'success': [],
            'errors': [],
            'total': len(developments)
        }
        
        for dev in developments:
            try:
                dev_id = dev.get('dev_id', 'N/A')
                name = dev.get('name', 'N/A')
                current_path = dev.get('folder_path', '')
                stage = dev.get('stage', 'N/A')
                
                if not current_path or not os.path.exists(current_path):
                    self._log(f"⚠️ Saltando {dev_id}: Carpeta no existe")
                    continue
                
                # Determinar ruta de destino basada en la etapa
                target_path = self._get_target_path_for_stage(stage)
                folder_name = os.path.basename(current_path)
                new_path = os.path.join(target_path, folder_name)
                
                # Mover carpeta
                if current_path != new_path:
                    shutil.move(current_path, new_path)
                    
                    results['success'].append({
                        'dev_id': dev_id,
                        'name': name,
                        'old_path': current_path,
                        'new_path': new_path
                    })
                    
                    self._log(f"✅ MOVIDO: {dev_id} | {name}")
                    self._log(f"   📁 De: {current_path}")
                    self._log(f"   📁 A: {new_path}")
                else:
                    self._log(f"ℹ️ Ya está en lugar correcto: {dev_id}")
                
            except Exception as e:
                results['errors'].append({
                    'dev_id': dev.get('dev_id', 'N/A'),
                    'name': dev.get('name', 'N/A'),
                    'error': str(e)
                })
                self._log(f"❌ ERROR: {dev.get('dev_id', 'N/A')} - {e}")
        
        # Resumen
        self._log(f"\n📊 RESUMEN DE MOVIMIENTO:")
        self._log(f"   ✅ Exitosos: {len(results['success'])}")
        self._log(f"   ❌ Errores: {len(results['errors'])}")
        self._log(f"   📋 Total: {results['total']}")
        
        return results
    
    def _clean_folder_name(self, name: str) -> str:
        """Limpiar nombre de carpeta de caracteres inválidos"""
        # Caracteres no permitidos en nombres de carpeta
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            name = name.replace(char, '_')
        
        # Limitar longitud
        if len(name) > 200:
            name = name[:200]
        
        return name.strip()
    
    def _get_target_path_for_stage(self, stage: str) -> str:
        """
        Obtener ruta de destino basada en la etapa
        
        Args:
            stage: Etapa del desarrollo
            
        Returns:
            Ruta de destino
        """
        # Mapeo de etapas a carpetas
        stage_mapping = {
            'Definición': 'Definición',
            'Análisis': 'Análisis',
            'Desarrollo del Requerimiento': 'Desarrollo del Requerimiento',
            'Plan de Pruebas': 'Plan de Pruebas',
            'Ejecución de Pruebas': 'Ejecución de Pruebas',
            'Despliegue (Pruebas)': 'Despliegue (Pruebas)',
            'Aprobación (Pase)': 'Aprobación (Pase)',
            'Devuelto': 'Devuelto',
            'Aprobación Propuesta': 'Aprobación Propuesta',
            'Elaboración Propuesta': 'Elaboración Propuesta'
        }
        
        # Obtener nombre de carpeta para la etapa
        folder_name = stage_mapping.get(stage, 'Otros')
        
        # Crear ruta completa
        return os.path.join(self.base_path, folder_name)
    
    def get_action_summary(self, suggestions: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Obtener resumen de acciones
        
        Args:
            suggestions: Lista de sugerencias
            
        Returns:
            Diccionario con conteos
        """
        summary = {
            'crear': 0,
            'abrir': 0,
            'pendiente': 0,
            'total': len(suggestions)
        }
        
        for suggestion in suggestions:
            action = suggestion.get('action', '⏸️ PENDIENTE')
            if action == "🆕 CREAR":
                summary['crear'] += 1
            elif action == "📁 ABRIR":
                summary['abrir'] += 1
            elif action == "⏸️ PENDIENTE":
                summary['pendiente'] += 1
        
        return summary
