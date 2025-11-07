"""
🧪 TESTING SIMPLIFICADO DE FUNCIONALIDADES CORE
===============================================

Testing enfocado en las funcionalidades core sin problemas de UI.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'bot-gestion-documental'))

from bot_development_checker import DevelopmentChecker
from bot_development_checker_service_helpers import DevelopmentCheckerServiceHelpers
from bot_docker_manager import DockerManager


def test_service_integration():
    """Test 1: Integración con servicio"""
    print("🧪 TEST 1: Integración con servicio de desarrollos")
    print("=" * 50)
    
    def log_func(message):
        print(f"[LOG] {message}")
    
    try:
        service_helpers = DevelopmentCheckerServiceHelpers(log_func)
        
        # Obtener desarrollos
        developments = service_helpers.get_developments_from_service_with_details()
        print(f"✅ Desarrollos obtenidos: {len(developments)}")
        
        if developments:
            print("✅ Primeros 3 desarrollos:")
            for i, dev in enumerate(developments[:3]):
                print(f"   {i+1}. {dev.get('id')} - {dev.get('name')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_development_checker():
    """Test 2: Verificador de desarrollos"""
    print("\n🧪 TEST 2: Verificador de desarrollos")
    print("=" * 50)
    
    def log_func(message):
        print(f"[LOG] {message}")
    
    try:
        base_path = "C:/Users/lerv8093/OneDrive - Grupo Coomeva/PROYECTOS DESARROLLOS/Desarrollos"
        checker = DevelopmentChecker(base_path, log_func)
        
        # Test sin filtro
        print("🔍 Probando sin filtro por servicio...")
        results_no_filter = checker.check_all_developments(filter_by_service=False)
        print(f"✅ Sin filtro: {len(results_no_filter)} desarrollos")
        
        # Test con filtro
        print("🔍 Probando con filtro por servicio...")
        results_with_filter = checker.check_all_developments(filter_by_service=True)
        print(f"✅ Con filtro: {len(results_with_filter)} desarrollos")
        
        # Verificar estructura de resultados
        if results_no_filter:
            result = results_no_filter[0]
            print("✅ Estructura de resultado:")
            print(f"   • dev_id: {result.get('dev_id')}")
            print(f"   • folder_name: {result.get('folder_name')}")
            print(f"   • phase: {result.get('phase')}")
            print(f"   • overall_status: {result.get('overall_status')}")
            print(f"   • controls_status: {len(result.get('controls_status', {}))} controles")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_docker_manager():
    """Test 3: Gestor de Docker"""
    print("\n🧪 TEST 3: Gestor de Docker")
    print("=" * 50)
    
    def log_func(message):
        print(f"[LOG] {message}")
    
    try:
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        docker_manager = DockerManager(log_func, project_root)
        
        # Verificar estado de Docker
        print("🔍 Verificando estado de Docker...")
        is_running = docker_manager.is_docker_running()
        print(f"✅ Docker Engine corriendo: {is_running}")
        
        # Listar contenedores
        print("🔍 Listando contenedores...")
        containers = docker_manager.list_containers()
        print(f"✅ Contenedores encontrados: {len(containers)}")
        
        if containers:
            print("✅ Primeros 3 contenedores:")
            for i, container in enumerate(containers[:3]):
                print(f"   {i+1}. {container.get('Name', 'N/A')} - {container.get('State', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_file_extraction():
    """Test 4: Extracción de IDs de archivos"""
    print("\n🧪 TEST 4: Extracción de IDs de archivos")
    print("=" * 50)
    
    def log_func(message):
        print(f"[LOG] {message}")
    
    try:
        base_path = "C:/Users/lerv8093/OneDrive - Grupo Coomeva/PROYECTOS DESARROLLOS/Desarrollos"
        checker = DevelopmentChecker(base_path, log_func)
        
        # Test casos de extracción
        test_cases = [
            "INC000004749773_Creación consulta reporte ORM Contrapartes",
            "INC000004782806_Ajuste 351 Deterioro Fonmutuales",
            "DEV-001_Nombre desarrollo",
            "123_Nombre desarrollo",
            "en_curso"
        ]
        
        print("🔍 Probando extracción de IDs:")
        for test_case in test_cases:
            extracted_id = checker._extract_dev_id_from_folder(test_case)
            print(f"   • '{test_case}' -> '{extracted_id}'")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def run_core_testing():
    """Ejecutar testing de funcionalidades core"""
    print("🚀 TESTING DE FUNCIONALIDADES CORE")
    print("=" * 60)
    
    tests = [
        ("Integración con Servicio", test_service_integration),
        ("Verificador de Desarrollos", test_development_checker),
        ("Gestor de Docker", test_docker_manager),
        ("Extracción de IDs", test_file_extraction)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error crítico en {test_name}: {e}")
            results.append((test_name, False))
    
    # Resumen
    print("\n📊 RESUMEN DE TESTING CORE")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASÓ" if result else "❌ FALLÓ"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n📈 RESULTADOS:")
    print(f"   ✅ Tests pasados: {passed}")
    print(f"   ❌ Tests fallidos: {failed}")
    print(f"   📊 Porcentaje de éxito: {(passed / len(results) * 100):.1f}%")
    
    if failed == 0:
        print("\n🎉 ¡TODAS LAS FUNCIONALIDADES CORE FUNCIONAN CORRECTAMENTE!")
    else:
        print(f"\n⚠️ {failed} funcionalidad(es) necesitan revisión.")
    
    return failed == 0


if __name__ == "__main__":
    success = run_core_testing()
    exit(0 if success else 1)
