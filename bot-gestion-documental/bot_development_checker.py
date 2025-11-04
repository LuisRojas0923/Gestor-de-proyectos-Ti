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
                if pattern == r'INC(\d+)':
                    # Para patrón INC, devolver el ID completo con prefijo
                    return match.group(0)  # INC000004749773
                else:
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
        for control_code in self.ti_manager.ti_controls:
            control_result = self._check_control_for_development(
                dev_id, folder_path, control_code
            )
            result['controls_status'][control_code] = control_result
            
            # Contar archivos (solo requeridos, no opcionales)
            optional_docs = self.ti_manager.ti_controls[control_code].get("optional_documents", [])
            required_docs_list = [doc for doc in control_result.get('files_required', []) if doc not in optional_docs]
            found_required_list = [f for f in control_result.get('files_found', []) 
                                   if not any(op in f for op in optional_docs)]
            
            result['total_files_found'] += len(found_required_list)
            result['total_files_required'] += len(required_docs_list)
            
            if control_result.get('can_copy', False):
                result['can_copy_any'] = True
        
        # Determinar estado general
        result['overall_status'] = self._determine_overall_status(result['controls_status'])
        
        return result
    
    def _check_control_for_development(self, dev_id: str, folder_path: str, control_code: str) -> Dict[str, Any]:
        """Verificar archivos requeridos para un control específico"""
        
        required_docs = self.ti_manager.ti_controls[control_code]["documents"]
        optional_docs = self.ti_manager.ti_controls[control_code].get("optional_documents", [])
        files_found = []
        files_missing = []
        optional_missing = []
        
        # Buscar cada archivo requerido
        for doc in required_docs:
            found_file = self._find_file_in_folder(folder_path, doc)
            if found_file:
                # Guardar el nombre real del archivo encontrado
                files_found.append(os.path.basename(found_file))
            elif doc in optional_docs:
                # Separar documentos opcionales de los requeridos
                optional_missing.append(doc)
            else:
                files_missing.append(doc)
        
        # Separar archivos encontrados en requeridos y opcionales
        found_required = [f for f in files_found if not any(op in f for op in optional_docs)]
        found_optional = [f for f in files_found if any(op in f for op in optional_docs)]
        
        # Considerar completo si solo faltan documentos opcionales
        can_copy = len(files_missing) == 0
        
        # Calcular porcentaje basado solo en documentos requeridos (no opcionales)
        required_count = len(required_docs) - len(optional_docs)
        completion_percentage = (len(found_required) / required_count * 100) if required_count > 0 else 100
        
        return {
            'control_code': control_code,
            'control_name': self.ti_manager.ti_controls[control_code]["name"],
            'files_required': required_docs,
            'files_found': files_found,
            'files_missing': files_missing,
            'optional_missing': optional_missing,
            'can_copy': can_copy,
            'completion_percentage': completion_percentage
        }
    
    def _find_file_in_folder(self, folder_path: str, filename: str) -> str:
        """Buscar archivo en una carpeta y retornar ruta completa (versión estricta)"""
        try:
            if not os.path.exists(folder_path):
                return ""
            
            filename_lower = filename.lower().strip()
            
            # Normalizar texto removiendo acentos para comparación
            import unicodedata
            filename_normalized = unicodedata.normalize('NFD', filename_lower).encode('ascii', 'ignore').decode('ascii')
            
            # Caso especial: correo electrónico
            if 'correo' in filename_normalized and 'electronico' in filename_normalized:
                # Buscar archivos de correo (.eml, .msg)
                email_extensions = ['.eml', '.msg']
                for root, dirs, files in os.walk(folder_path):
                    for file in files:
                        file_ext = os.path.splitext(file)[1].lower()
                        if file_ext in email_extensions:
                            # Cualquier archivo de correo cuenta como correo electrónico
                            return os.path.join(root, file)
                return ""
            
            # Caso especial: Test de pruebas - buscar cualquier archivo que contenga "test"
            if 'test' in filename_normalized and 'pruebas' in filename_normalized:
                # Buscar archivos que contengan "test" (o "testing") - solo requiere "test"
                for root, dirs, files in os.walk(folder_path):
                    for file in files:
                        file_lower = file.lower()
                        file_normalized = unicodedata.normalize('NFD', file_lower).encode('ascii', 'ignore').decode('ascii')
                        # Verificar que contenga "test" o "testing"
                        if 'test' in file_normalized or 'testing' in file_normalized:
                            return os.path.join(root, file)
                return ""
            
            # Extraer código de formato específico si existe
            import re
            format_code_pattern = r'fd-ft-\d+'
            format_match = re.search(format_code_pattern, filename_lower)
            format_code = format_match.group() if format_match else None
            
            # Buscar recursivamente en la carpeta
            best_match = None
            best_score = 0
            
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    file_lower = file.lower()
                    file_path = os.path.join(root, file)
                    
                    # Si hay código de formato específico, DEBE estar presente
                    if format_code:
                        if format_code not in file_lower:
                            continue
                    else:
                        # Si no hay código, buscar texto completo o palabras clave
                        if filename_lower not in file_lower:
                            # Verificar si hay suficientes palabras clave en común
                            if not self._has_sufficient_keyword_match(filename_lower, file_lower):
                                continue
                    
                    # Verificar coincidencia completa (mejor match)
                    if filename_lower in file_lower:
                        return file_path
                    
                    # Si hay código de formato y coincide, verificar palabras clave
                    if format_code and format_code in file_lower:
                        ignore_words = {'de', 'del', 'la', 'el', 'en', 'caso', 'novedad', 'para', 'al', 'con', 'y', 'o', 'formato', 'format'}
                        keywords = [w.strip('-') for w in filename_lower.split() 
                                  if w.strip('-') not in ignore_words and len(w.strip('-')) > 3]
                        
                        if keywords:
                            found_keywords = sum(1 for kw in keywords if kw in file_lower)
                            score = found_keywords / len(keywords) if keywords else 0
                            if score >= 0.6:
                                if score > best_score:
                                    best_score = score
                                    best_match = file_path
                        else:
                            return file_path
                    else:
                        # Sin código de formato, usar búsqueda por palabras clave
                        score = self._calculate_match_score(filename_lower, file_lower)
                        if score >= 0.6:
                            if score > best_score:
                                best_score = score
                                best_match = file_path
            
            return best_match if best_match else ""
            
        except Exception as e:
            self._log(f"❌ Error buscando archivo {filename}: {e}")
            return ""
    
    def _has_sufficient_keyword_match(self, search_text: str, file_text: str) -> bool:
        """Verificar si hay suficientes palabras clave en común"""
        import re
        ignore_words = {'de', 'del', 'la', 'el', 'en', 'caso', 'novedad', 'para', 'al', 'con', 'y', 'o', 'formato', 'format', 'del', 'las', 'los', 'un', 'una', 'el', 'la'}
        
        # Remover extensión del nombre de archivo antes de extraer palabras clave
        file_base = os.path.splitext(file_text)[0] if '.' in file_text else file_text
        
        # Extraer palabras clave del texto de búsqueda
        search_words = [w.strip('-') for w in re.split(r'[\s\-_]+', search_text.lower()) 
                       if w.strip('-') not in ignore_words and len(w.strip('-')) > 2]
        
        # Extraer palabras clave del nombre del archivo (sin extensión)
        file_words = [w.strip('-') for w in re.split(r'[\s\-_]+', file_base.lower()) 
                     if w.strip('-') not in ignore_words and len(w.strip('-')) > 2]
        
        if not search_words:
            return False
        
        # Contar coincidencias (incluyendo variaciones similares)
        matches = 0
        for sw in search_words:
            # Buscar coincidencia exacta o parcial
            if any(sw in fw or fw in sw for fw in file_words):
                matches += 1
            # Buscar variaciones comunes (ej: funcionamiento/funcional, pruebas/prueba)
            elif self._are_words_similar(sw, file_words):
                matches += 1
        
        # Requerir al menos 60% de coincidencias
        return matches >= max(1, len(search_words) * 0.6)
    
    def _are_words_similar(self, word: str, word_list: list) -> bool:
        """Verificar si una palabra es similar a alguna en una lista"""
        variations = {
            'funcionamiento': ['funcional', 'funcion'],
            'funcional': ['funcionamiento', 'funcion'],
            'pruebas': ['prueba', 'test', 'testing'],
            'prueba': ['pruebas', 'test', 'testing'],
            'test': ['pruebas', 'prueba', 'testing'],
            'testing': ['pruebas', 'prueba', 'test'],
            'desarrollo': ['desarrollos'],
            'desarrollos': ['desarrollo'],
            'instructivo': ['instruccion', 'instructivo', 'guia'],
            'instruccion': ['instructivo', 'guia'],
            'correo': ['email', 'mail'],
            'electronico': ['email', 'mail']
        }
        
        if word in variations:
            return any(v in word_list for v in variations[word])
        
        # Verificar si la palabra comienza con las mismas letras (al menos 5 caracteres)
        if len(word) >= 5:
            return any(fw.startswith(word[:5]) or word.startswith(fw[:5]) for fw in word_list if len(fw) >= 5)
            
            return False
            
    def _calculate_match_score(self, search_text: str, file_text: str) -> float:
        """Calcular score de coincidencia entre texto de búsqueda y nombre de archivo"""
        import re
        ignore_words = {'de', 'del', 'la', 'el', 'en', 'caso', 'novedad', 'para', 'al', 'con', 'y', 'o', 'formato', 'format', 'del', 'las', 'los', 'un', 'una', 'el', 'la'}
        
        # Remover extensión del nombre de archivo antes de extraer palabras clave
        file_base = os.path.splitext(file_text)[0] if '.' in file_text else file_text
        
        # Extraer palabras clave del texto de búsqueda
        search_words = [w.strip('-') for w in re.split(r'[\s\-_]+', search_text.lower()) 
                       if w.strip('-') not in ignore_words and len(w.strip('-')) > 2]
        
        # Extraer palabras clave del nombre del archivo (sin extensión)
        file_words = [w.strip('-') for w in re.split(r'[\s\-_]+', file_base.lower()) 
                     if w.strip('-') not in ignore_words and len(w.strip('-')) > 2]
        
        if not search_words:
            return 0.0
        
        # Contar coincidencias (incluyendo variaciones similares)
        matches = 0
        for sw in search_words:
            if any(sw in fw or fw in sw for fw in file_words):
                matches += 1
            elif self._are_words_similar(sw, file_words):
                matches += 1
        
        return matches / len(search_words) if search_words else 0.0
    
    def _search_file_in_folder(self, folder_path: str, filename: str) -> bool:
        """Buscar archivo en una carpeta específica de desarrollo (búsqueda inteligente y estricta)"""
        found_file = self._find_file_in_folder(folder_path, filename)
        return bool(found_file)
    
    def _create_search_patterns(self, filename: str) -> List[str]:
        """Crear patrones de búsqueda inteligentes basados en el nombre del archivo (DEPRECADO - usar _search_file_in_folder directamente)"""
        patterns = []
        filename_lower = filename.lower()
        
        # Patrón original completo
        patterns.append(filename_lower)
        
        # Extraer códigos específicos (ej: FD-FT-284, FD-FT-060)
        import re
        code_matches = re.findall(r'[a-z]+-[a-z]+-\d+', filename_lower)
        for code in code_matches:
            patterns.append(code)
        
        # Eliminar duplicados y patrones muy cortos
        patterns = list(set([p for p in patterns if len(p) >= 3]))
        
        return patterns
    
    def _determine_overall_status(self, controls_status: Dict[str, Any]) -> str:
        """Determinar estado general del desarrollo"""
        
        if not controls_status:
            return 'NO_CONTROLS'
        
        total_controls = len(controls_status)
        complete_controls = 0
        
        for control_code, status in controls_status.items():
            files_missing = status.get('files_missing', [])
            optional_missing = status.get('optional_missing', [])
            
            # Un control se considera completo si no faltan documentos requeridos
            # (puede faltar documentos opcionales)
            if len(files_missing) == 0:
                complete_controls += 1
        
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
