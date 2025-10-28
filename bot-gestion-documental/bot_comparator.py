"""
Bot Comparator - Funcionalidad de comparación y sugerencias
==========================================================

Módulo para comparar desarrollos del servicio contra rutas existentes
y sugerir acciones apropiadas.
"""

import os
import re
from typing import List, Dict, Any


class DevelopmentComparator:
    """Comparador de desarrollos y sugerencias de acciones"""
    
    def __init__(self, base_path: str, log_callback=None):
        self.base_path = base_path
        self.log_callback = log_callback or print
    
    def _log(self, message: str):
        """Log con callback"""
        self.log_callback(message)
    
    def compare_developments(self, developments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Comparar desarrollos contra rutas existentes y generar sugerencias
        
        Args:
            developments: Lista de desarrollos del servicio
            
        Returns:
            Lista de sugerencias con acciones recomendadas
        """
        self._log("🔍 Comparando desarrollos contra rutas existentes...")
        
        if not developments:
            self._log("❌ No hay desarrollos para comparar")
            return []
        
        try:
            # Obtener todas las carpetas existentes
            existing_folders = self._get_all_folders()
            self._log(f"📁 Encontradas {len(existing_folders)} carpetas existentes")
            
            suggestions = []
            
            # Comparar cada desarrollo
            for dev in developments:
                try:
                    if not dev:
                        continue
                    
                    suggestion = self._analyze_development(dev, existing_folders)
                    suggestions.append(suggestion)
                    
                    self._log(f"🔍 {suggestion['dev_id']} | {suggestion['name']} | {suggestion['suggestion']}")
                    
                except Exception as e:
                    self._log(f"❌ Error procesando {dev.get('id', 'N/A')}: {e}")
                    continue
            
            # Generar resumen
            self._generate_summary(suggestions)
            
            return suggestions
            
        except Exception as e:
            self._log(f"❌ Error en comparación: {e}")
            return []
    
    def _analyze_development(self, dev: Dict[str, Any], existing_folders: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analizar un desarrollo individual y generar sugerencia
        
        Args:
            dev: Desarrollo del servicio
            existing_folders: Carpetas existentes
            
        Returns:
            Diccionario con sugerencia
        """
        # Extraer información del desarrollo
        dev_id = dev.get('id', 'N/A')
        name = dev.get('name', 'N/A')
        stage = dev.get('current_stage', 'N/A')
        
        if not stage:
            last_activity = dev.get('last_activity')
            if last_activity and isinstance(last_activity, dict):
                stage = last_activity.get('stage_name', 'N/A')
            else:
                stage = 'N/A'
        
        # Verificar si el desarrollo tiene etapa válida
        if stage == 'N/A' or not stage or stage.strip() == '':
            return {
                'dev_id': dev_id,
                'name': name,
                'stage': 'Sin etapa',
                'folder_path': None,
                'action': "⏸️ PENDIENTE",
                'suggestion': "No se puede procesar - Sin etapa definida",
                'development': dev,
                'can_process': False
            }
        
        # Buscar carpeta correspondiente
        folder_path = self._find_folder_for_development(dev_id, existing_folders)
        
        # Determinar acción sugerida
        if folder_path:
            action = "📁 ABRIR"
            suggestion = "Carpeta encontrada"
        else:
            action = "🆕 CREAR"
            suggestion = "Crear nueva carpeta"
        
        return {
            'dev_id': dev_id,
            'name': name,
            'stage': stage,
            'folder_path': folder_path,
            'action': action,
            'suggestion': suggestion,
            'development': dev,
            'can_process': True
        }
    
    def _find_folder_for_development(self, dev_id: str, existing_folders: List[Dict[str, Any]]) -> str:
        """
        Buscar carpeta existente para un desarrollo
        
        Args:
            dev_id: ID del desarrollo
            existing_folders: Lista de carpetas existentes
            
        Returns:
            Ruta de la carpeta si existe, None si no
        """
        for folder in existing_folders:
            if folder['dev_id'] == dev_id:
                return folder['path']
        return None
    
    def _get_all_folders(self) -> List[Dict[str, Any]]:
        """
        Obtener todas las carpetas existentes en el directorio base
        
        Returns:
            Lista de diccionarios con información de carpetas
        """
        folders = []
        try:
            if not os.path.exists(self.base_path):
                return folders
            
            for root, dirs, files in os.walk(self.base_path):
                for dir_name in dirs:
                    if "INC" in dir_name:
                        match = re.search(r'INC\d+', dir_name)
                        if match:
                            dev_id = match.group()
                            folders.append({
                                'dev_id': dev_id,
                                'folder_name': dir_name,
                                'path': os.path.join(root, dir_name)
                            })
        except Exception as e:
            self._log(f"❌ Error obteniendo carpetas: {e}")
        
        return folders
    
    def _generate_summary(self, suggestions: List[Dict[str, Any]]):
        """
        Generar resumen de sugerencias
        
        Args:
            suggestions: Lista de sugerencias generadas
        """
        if not suggestions:
            return
        
        self._log(f"\n📊 RESUMEN DE COMPARACIÓN:")
        self._log(f"   📋 Total desarrollos: {len(suggestions)}")
        
        crear_count = sum(1 for s in suggestions if s['action'] == "🆕 CREAR")
        abrir_count = sum(1 for s in suggestions if s['action'] == "📁 ABRIR")
        pendiente_count = sum(1 for s in suggestions if s['action'] == "⏸️ PENDIENTE")
        
        self._log(f"   🆕 Necesitan crear carpeta: {crear_count}")
        self._log(f"   📁 Carpetas existentes: {abrir_count}")
        self._log(f"   ⏸️ Pendientes (sin etapa): {pendiente_count}")
        
        if crear_count > 0:
            self._log(f"\n💡 SUGERENCIAS DE CREACIÓN:")
            for suggestion in suggestions:
                if suggestion['action'] == "🆕 CREAR":
                    self._log(f"   • {suggestion['dev_id']}: {suggestion['name']}")
        
        if pendiente_count > 0:
            self._log(f"\n⚠️ DESARROLLOS PENDIENTES (Sin etapa definida):")
            for suggestion in suggestions:
                if suggestion['action'] == "⏸️ PENDIENTE":
                    self._log(f"   • {suggestion['dev_id']}: {suggestion['name']}")
        
        self._log("✅ Comparación completada")
    
    def get_suggestions_for_action(self, suggestions: List[Dict[str, Any]], action: str) -> List[Dict[str, Any]]:
        """
        Filtrar sugerencias por tipo de acción
        
        Args:
            suggestions: Lista de sugerencias
            action: Tipo de acción a filtrar
            
        Returns:
            Lista filtrada de sugerencias
        """
        return [s for s in suggestions if s['action'] == action]
    
    def get_creation_suggestions(self, suggestions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Obtener sugerencias de creación de carpetas"""
        return self.get_suggestions_for_action(suggestions, "🆕 CREAR")
    
    def get_open_suggestions(self, suggestions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Obtener sugerencias de apertura de carpetas"""
        return self.get_suggestions_for_action(suggestions, "📁 ABRIR")
    
    def get_pending_suggestions(self, suggestions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Obtener sugerencias de desarrollos pendientes (sin etapa)"""
        return self.get_suggestions_for_action(suggestions, "⏸️ PENDIENTE")
    
    def get_processable_suggestions(self, suggestions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Obtener solo sugerencias que se pueden procesar (tienen etapa)"""
        return [s for s in suggestions if s.get('can_process', True)]
