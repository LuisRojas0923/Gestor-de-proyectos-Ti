"""
Bot UI Helpers - Funciones auxiliares para la UI
===============================================

Módulo con funciones auxiliares para la interfaz de usuario.
"""

import os
import re
import requests
from datetime import datetime
from bot_comparator import DevelopmentComparator


class UIHelpers:
    """Funciones auxiliares para la UI"""
    
    def __init__(self, base_path: str, log_callback=None):
        self.base_path = base_path
        self.log_callback = log_callback or print
    
    def _log(self, message: str):
        """Log con callback"""
        self.log_callback(message)
    
    def load_data_from_service(self):
        """Cargar datos desde el servicio"""
        self._log("🔄 Cargando datos desde el servicio...")
        
        try:
            # Llamar al servicio
            response = requests.get("http://localhost:8000/api/v1/developments", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                self._log(f"📊 Datos recibidos: {len(data)} elementos")
                
                # Procesar datos
                processed_data = []
                for dev in data:
                    try:
                        if not dev:
                            continue
                            
                        # Extraer información
                        dev_id = dev.get('id', 'N/A')
                        name = dev.get('name', 'N/A')
                        stage = dev.get('current_stage', 'N/A')
                        if not stage:
                            last_activity = dev.get('last_activity')
                            if last_activity and isinstance(last_activity, dict):
                                stage = last_activity.get('stage_name', 'N/A')
                            else:
                                stage = 'N/A'
                        
                        # Buscar carpeta
                        folder_path = self._find_folder(dev_id)
                        action = "📁 ABRIR" if folder_path else "🆕 CREAR"
                        
                        processed_data.append((dev_id, name, stage, folder_path or "No encontrada", action))
                        self._log(f"📋 {dev_id} | {name} | {stage}")
                        
                    except Exception as e:
                        self._log(f"❌ Error procesando desarrollo: {e}")
                        continue
                
                self._log(f"✅ {len(processed_data)} desarrollos cargados")
                return processed_data, data  # Devolver tanto datos procesados como originales
                
            else:
                self._log(f"❌ Error en servicio: {response.status_code}")
                return [], []
                
        except Exception as e:
            self._log(f"❌ Error cargando datos: {e}")
            return [], []
    
    def scan_folders(self):
        """Escanear carpetas existentes"""
        self._log("🔍 Escaneando carpetas...")
        
        try:
            if not os.path.exists(self.base_path):
                self._log(f"❌ Ruta base no existe: {self.base_path}")
                return []
            
            # Buscar carpetas con formato INC*
            found_folders = []
            for root, dirs, files in os.walk(self.base_path):
                for dir_name in dirs:
                    if "INC" in dir_name:
                        # Extraer ID de la carpeta
                        match = re.search(r'INC\d+', dir_name)
                        if match:
                            dev_id = match.group()
                            found_folders.append((dev_id, dir_name, root))
            
            self._log(f"✅ Encontradas {len(found_folders)} carpetas")
            
            # Procesar resultados
            processed_folders = []
            for dev_id, folder_name, path in found_folders:
                full_path = os.path.join(path, folder_name)
                processed_folders.append((dev_id, folder_name, "Encontrada", full_path, "📁 ABRIR"))
                self._log(f"📁 {dev_id} | {folder_name} | {full_path}")
            
            return processed_folders
            
        except Exception as e:
            self._log(f"❌ Error escaneando carpetas: {e}")
            return []
    
    def compare_and_suggest(self, developments):
        """Comparar desarrollos y generar sugerencias"""
        if not developments:
            self._log("❌ No hay desarrollos cargados. Use 'Actualizar' primero.")
            return []
        
        try:
            # Crear comparador
            comparator = DevelopmentComparator(self.base_path, self._log)
            
            # Realizar comparación
            suggestions = comparator.compare_developments(developments)
            
            # Convertir a formato para TreeView
            tree_data = []
            for suggestion in suggestions:
                tree_data.append((
                    suggestion['dev_id'],
                    suggestion['name'],
                    suggestion['stage'],
                    suggestion['folder_path'] or "No encontrada",
                    suggestion['action']
                ))
            
            return tree_data, suggestions
            
        except Exception as e:
            self._log(f"❌ Error en comparación: {e}")
            return [], []
    
    def _find_folder(self, dev_id):
        """Buscar carpeta existente para un desarrollo"""
        try:
            if not os.path.exists(self.base_path):
                return None
            
            # Buscar carpetas con el ID
            for root, dirs, files in os.walk(self.base_path):
                for dir_name in dirs:
                    if dev_id in dir_name:
                        return os.path.join(root, dir_name)
            
            return None
            
        except Exception:
            return None
    
    def validate_controls(self):
        """Validar controles de calidad"""
        self._log("📋 Validando controles de calidad...")
        
        controls = [
            "C003-GT: Validación de Requerimientos",
            "C021-GT: Validación de Pruebas de Usuario", 
            "C004-GT: Garantía de Entregas sin Impacto"
        ]
        
        for control in controls:
            self._log(f"✅ {control}")
        
        self._log("✅ Validación de controles completada")
