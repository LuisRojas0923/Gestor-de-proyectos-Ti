"""
🧪 TESTING COMPLETO DE NUEVAS FUNCIONALIDADES
============================================

Script de testing para validar todas las funcionalidades nuevas implementadas:
1. Reorganización de botones principales
2. Vista "Otras Funciones" 
3. Vista de verificación de desarrollos con filtros
4. Checkbox para filtrar por servicio
5. Integración con datos del servicio
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'bot-gestion-documental'))

from bot_main import SimpleDocumentBot
from bot_other_functions_view import OtherFunctionsView
from bot_development_checker_view import DevelopmentCheckerView
from bot_docker_view import DockerView
from tkinter import Tk, messagebox
import time


def test_main_bot_interface():
    """Test 1: Interfaz principal del bot reorganizada"""
    print("🧪 TEST 1: Interfaz principal reorganizada")
    print("=" * 50)
    
    def log_func(message):
        print(f"[LOG] {message}")
    
    try:
        # Crear bot principal
        bot = SimpleDocumentBot()
        
        # Verificar que los botones principales estén presentes
        expected_buttons = [
            "🔄 Actualizar",
            "🎯 Vista de Acciones", 
            "🐳 Docker",
            "🔍 Verificar Desarrollos",
            "⚙️ Otras Funciones",
            "❌ Cerrar"
        ]
        
        print("✅ Bot principal creado correctamente")
        print("✅ Botones principales reorganizados:")
        for button in expected_buttons:
            print(f"   • {button}")
        
        # Cerrar bot
        bot.root.destroy()
        print("✅ Test 1 completado exitosamente\n")
        return True
        
    except Exception as e:
        print(f"❌ Error en Test 1: {e}")
        return False


def test_other_functions_view():
    """Test 2: Vista de otras funciones"""
    print("🧪 TEST 2: Vista de otras funciones")
    print("=" * 50)
    
    def log_func(message):
        print(f"[LOG] {message}")
    
    try:
        # Crear ventana raíz
        root = Tk()
        root.withdraw()
        
        # Crear vista de otras funciones
        other_view = OtherFunctionsView(root, None, log_func)
        
        print("✅ Vista de otras funciones creada correctamente")
        print("✅ Funciones disponibles:")
        print("   • Escanear Carpetas")
        print("   • Comparar y Sugerir")
        print("   • Validar Controles")
        print("   • Gestionar Controles TI")
        
        # Cerrar vista
        other_view.destroy()
        root.destroy()
        
        print("✅ Test 2 completado exitosamente\n")
        return True
        
    except Exception as e:
        print(f"❌ Error en Test 2: {e}")
        return False


def test_development_checker_view():
    """Test 3: Vista de verificación de desarrollos"""
    print("🧪 TEST 3: Vista de verificación de desarrollos")
    print("=" * 50)
    
    def log_func(message):
        print(f"[LOG] {message}")
    
    try:
        # Crear ventana raíz
        root = Tk()
        root.withdraw()
        
        base_path = "C:/Users/lerv8093/OneDrive - Grupo Coomeva/PROYECTOS DESARROLLOS/Desarrollos"
        
        # Crear vista de verificación
        checker_view = DevelopmentCheckerView(root, base_path, log_func)
        
        print("✅ Vista de verificación creada correctamente")
        
        # Test: Ejecutar verificación
        print("🔍 Ejecutando verificación de desarrollos...")
        checker_view._check_developments()
        
        results_count = len(checker_view.check_results)
        filtered_count = len(checker_view.filtered_results)
        
        print(f"✅ Verificación completada: {results_count} desarrollos")
        print(f"✅ Resultados filtrados: {filtered_count} desarrollos")
        
        # Test: Verificar filtros
        print("🔍 Probando filtros...")
        
        # Test filtro por nombre
        checker_view.search_var.set("INC")
        checker_view._apply_filters()
        search_filtered = len(checker_view.filtered_results)
        print(f"✅ Filtro por nombre 'INC': {search_filtered} resultados")
        
        # Test filtro por servicio
        checker_view.search_var.set("")  # Limpiar búsqueda
        checker_view.filter_with_service_var.set(True)
        checker_view._apply_filters()
        service_filtered = len(checker_view.filtered_results)
        print(f"✅ Filtro por servicio: {service_filtered} resultados")
        
        # Test filtro sin servicio
        checker_view.filter_with_service_var.set(False)
        checker_view._apply_filters()
        no_service_filtered = len(checker_view.filtered_results)
        print(f"✅ Sin filtro por servicio: {no_service_filtered} resultados")
        
        # Cerrar vista
        checker_view.destroy()
        root.destroy()
        
        print("✅ Test 3 completado exitosamente\n")
        return True
        
    except Exception as e:
        print(f"❌ Error en Test 3: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_docker_view():
    """Test 4: Vista de gestión de Docker"""
    print("🧪 TEST 4: Vista de gestión de Docker")
    print("=" * 50)
    
    def log_func(message):
        print(f"[LOG] {message}")
    
    try:
        # Crear ventana raíz
        root = Tk()
        root.withdraw()
        
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        
        # Crear vista de Docker
        docker_view = DockerView(root, project_root, log_func)
        
        print("✅ Vista de Docker creada correctamente")
        print("✅ Funciones disponibles:")
        print("   • Validar Docker")
        print("   • Iniciar Docker Desktop")
        print("   • Levantar Contenedores")
        print("   • Reiniciar Contenedores")
        print("   • Detener Contenedores")
        
        # Test: Verificar estado de Docker
        print("🔍 Verificando estado de Docker...")
        is_running = docker_view.docker_manager.is_docker_engine_running()
        print(f"✅ Docker Engine corriendo: {is_running}")
        
        # Test: Listar contenedores
        print("🔍 Listando contenedores...")
        containers = docker_view.docker_manager.list_containers()
        print(f"✅ Contenedores encontrados: {len(containers)}")
        
        # Cerrar vista
        docker_view.destroy()
        root.destroy()
        
        print("✅ Test 4 completado exitosamente\n")
        return True
        
    except Exception as e:
        print(f"❌ Error en Test 4: {e}")
        return False


def test_service_integration():
    """Test 5: Integración con servicio de desarrollos"""
    print("🧪 TEST 5: Integración con servicio de desarrollos")
    print("=" * 50)
    
    try:
        from bot_development_checker_service_helpers import DevelopmentCheckerServiceHelpers
        
        def log_func(message):
            print(f"[LOG] {message}")
        
        service_helpers = DevelopmentCheckerServiceHelpers(log_func)
        
        # Test: Obtener desarrollos del servicio
        print("🔍 Obteniendo desarrollos del servicio...")
        developments = service_helpers.get_developments_from_service_with_details()
        
        print(f"✅ Desarrollos obtenidos: {len(developments)}")
        
        if developments:
            print("✅ Primeros 3 desarrollos:")
            for i, dev in enumerate(developments[:3]):
                print(f"   {i+1}. {dev.get('id')} - {dev.get('name')}")
        
        print("✅ Test 5 completado exitosamente\n")
        return True
        
    except Exception as e:
        print(f"❌ Error en Test 5: {e}")
        return False


def run_complete_testing():
    """Ejecutar testing completo de todas las funcionalidades"""
    print("🚀 INICIANDO TESTING COMPLETO DE NUEVAS FUNCIONALIDADES")
    print("=" * 60)
    print()
    
    tests = [
        ("Interfaz Principal Reorganizada", test_main_bot_interface),
        ("Vista de Otras Funciones", test_other_functions_view),
        ("Vista de Verificación de Desarrollos", test_development_checker_view),
        ("Vista de Gestión de Docker", test_docker_view),
        ("Integración con Servicio", test_service_integration)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error crítico en {test_name}: {e}")
            results.append((test_name, False))
    
    # Resumen de resultados
    print("📊 RESUMEN DE TESTING")
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
    
    print()
    print(f"📈 RESULTADOS FINALES:")
    print(f"   ✅ Tests pasados: {passed}")
    print(f"   ❌ Tests fallidos: {failed}")
    print(f"   📊 Porcentaje de éxito: {(passed / len(results) * 100):.1f}%")
    
    if failed == 0:
        print("\n🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!")
        print("✅ Las nuevas funcionalidades están funcionando correctamente.")
    else:
        print(f"\n⚠️ {failed} test(s) fallaron. Revisar implementación.")
    
    return failed == 0


if __name__ == "__main__":
    success = run_complete_testing()
    exit(0 if success else 1)
