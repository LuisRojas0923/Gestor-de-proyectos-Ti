"""
Test específico para validar la nueva lógica de búsqueda
========================================================

Test enfocado en el desarrollo INC000004486849 para verificar que la nueva
lógica de búsqueda encuentra todos los archivos relevantes.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'bot-gestion-documental'))

from bot_development_checker import DevelopmentChecker


def test_specific_development():
    """Test específico para el desarrollo INC000004486849"""
    print("🧪 TEST ESPECÍFICO: INC000004486849")
    print("=" * 50)
    
    def log_func(message):
        print(f"[LOG] {message}")
    
    try:
        base_path = "C:/Users/lerv8093/OneDrive - Grupo Coomeva/PROYECTOS DESARROLLOS/Desarrollos"
        checker = DevelopmentChecker(base_path, log_func)
        
        # Carpeta específica del desarrollo
        dev_folder = "C:/Users/lerv8093/OneDrive - Grupo Coomeva/PROYECTOS DESARROLLOS/Desarrollos/Despliegue (Pruebas)/INC000004486849_Listas de Ajustes Cautelares"
        
        print(f"🔍 Verificando desarrollo: INC000004486849")
        print(f"📁 Carpeta: {dev_folder}")
        
        # Test de patrones de búsqueda
        test_files = [
            "FD-FT-284 Formato de requerimiento de necesidades",
            "Correo electronico en caso de novedad",
            "FD-FT-060 Formato Pruebas Aplicativo",
            "Test de pruebas del desarrollo para nuevo desarrollo",
            "Instructivo de pruebas del desarrollo",
            "Test de Funcionamiento"
        ]
        
        print("\n🔍 Probando búsqueda de archivos específicos:")
        for test_file in test_files:
            found = checker._search_file_in_folder(dev_folder, test_file)
            status = "✅ ENCONTRADO" if found else "❌ NO ENCONTRADO"
            print(f"   {status}: {test_file}")
        
        # Test de patrones de búsqueda
        print("\n🔍 Probando patrones de búsqueda:")
        for test_file in test_files:
            patterns = checker._create_search_patterns(test_file)
            print(f"   📋 {test_file}")
            print(f"      Patrones: {patterns}")
        
        # Test completo del desarrollo
        print("\n🔍 Ejecutando verificación completa del desarrollo...")
        result = checker._check_single_development(
            "INC000004486849", 
            dev_folder, 
            "INC000004486849_Listas de Ajustes Cautelares",
            "Despliegue (Pruebas)"
        )
        
        print(f"\n📊 RESULTADOS DE VERIFICACIÓN:")
        print(f"   • ID: {result.get('dev_id')}")
        print(f"   • Carpeta: {result.get('folder_name')}")
        print(f"   • Fase: {result.get('phase')}")
        print(f"   • Estado: {result.get('overall_status')}")
        print(f"   • Archivos encontrados: {result.get('total_files_found')}")
        print(f"   • Archivos requeridos: {result.get('total_files_required')}")
        
        # Detalles por control
        controls_status = result.get('controls_status', {})
        print(f"\n📋 DETALLES POR CONTROL:")
        for control_code, status_info in controls_status.items():
            print(f"   {control_code}:")
            print(f"      • Estado: {status_info.get('status')}")
            print(f"      • Archivos encontrados: {len(status_info.get('files_found', []))}")
            print(f"      • Archivos faltantes: {len(status_info.get('files_missing', []))}")
            print(f"      • Puede copiar: {status_info.get('can_copy')}")
            
            if status_info.get('files_found'):
                print(f"      • ✅ Encontrados: {status_info['files_found']}")
            if status_info.get('files_missing'):
                print(f"      • ❌ Faltantes: {status_info['files_missing']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en test: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_specific_development()
    if success:
        print("\n✅ Test completado exitosamente")
    else:
        print("\n❌ Test falló")
    exit(0 if success else 1)
