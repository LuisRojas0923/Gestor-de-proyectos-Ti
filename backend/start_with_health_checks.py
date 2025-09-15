#!/usr/bin/env python3
"""
Script de inicio del backend con health checks configurados
Demuestra diferentes configuraciones para diferentes entornos
"""

import os
import sys
import asyncio
import uvicorn
from dotenv import load_dotenv

def setup_development_environment():
    """Configura el entorno para desarrollo"""
    print("🔧 Configurando entorno de desarrollo...")
    
    # Configuración para desarrollo
    os.environ["HEALTH_CHECKS_ENABLED"] = "true"
    os.environ["HEALTH_CHECKS_MODE"] = "startup"
    os.environ["HEALTH_CHECK_DATABASE"] = "true"
    os.environ["HEALTH_CHECK_API_ENDPOINTS"] = "true"
    os.environ["HEALTH_CHECK_AI_SERVICES"] = "true"
    os.environ["HEALTH_CHECK_EXTERNAL"] = "false"  # Evitar llamadas externas en desarrollo
    os.environ["HEALTH_CHECK_SYSTEM_RESOURCES"] = "true"
    os.environ["HEALTH_LOG_LEVEL"] = "INFO"
    os.environ["HEALTH_LOG_FAILURES_ONLY"] = "false"
    
    print("✅ Entorno de desarrollo configurado")

def setup_production_environment():
    """Configura el entorno para producción"""
    print("🔧 Configurando entorno de producción...")
    
    # Configuración para producción
    os.environ["HEALTH_CHECKS_ENABLED"] = "true"
    os.environ["HEALTH_CHECKS_MODE"] = "startup"
    os.environ["HEALTH_CHECK_DATABASE"] = "true"
    os.environ["HEALTH_CHECK_API_ENDPOINTS"] = "true"
    os.environ["HEALTH_CHECK_AI_SERVICES"] = "true"
    os.environ["HEALTH_CHECK_EXTERNAL"] = "false"  # Evitar llamadas externas en producción
    os.environ["HEALTH_CHECK_SYSTEM_RESOURCES"] = "true"
    os.environ["HEALTH_LOG_LEVEL"] = "WARNING"
    os.environ["HEALTH_LOG_FAILURES_ONLY"] = "true"  # Solo log de errores en producción
    
    print("✅ Entorno de producción configurado")

def setup_testing_environment():
    """Configura el entorno para testing"""
    print("🔧 Configurando entorno de testing...")
    
    # Configuración para testing
    os.environ["HEALTH_CHECKS_ENABLED"] = "true"
    os.environ["HEALTH_CHECKS_MODE"] = "on_demand"  # Solo bajo demanda para tests
    os.environ["HEALTH_CHECK_DATABASE"] = "true"
    os.environ["HEALTH_CHECK_API_ENDPOINTS"] = "true"
    os.environ["HEALTH_CHECK_AI_SERVICES"] = "false"  # Deshabilitar IA en tests
    os.environ["HEALTH_CHECK_EXTERNAL"] = "false"
    os.environ["HEALTH_CHECK_SYSTEM_RESOURCES"] = "false"  # Deshabilitar recursos en tests
    os.environ["HEALTH_LOG_LEVEL"] = "ERROR"
    os.environ["HEALTH_LOG_FAILURES_ONLY"] = "true"
    
    print("✅ Entorno de testing configurado")

def setup_disabled_environment():
    """Configura el entorno con health checks deshabilitados"""
    print("🔧 Deshabilitando health checks...")
    
    os.environ["HEALTH_CHECKS_ENABLED"] = "false"
    
    print("✅ Health checks deshabilitados")

def show_help():
    """Muestra la ayuda del script"""
    print("""
🚀 Script de Inicio del Backend con Health Checks

Uso:
    python start_with_health_checks.py [ENTORNO]

Entornos disponibles:
    dev, development    - Entorno de desarrollo (health checks al inicio)
    prod, production    - Entorno de producción (health checks optimizados)
    test, testing       - Entorno de testing (health checks bajo demanda)
    disabled            - Health checks deshabilitados
    help                - Mostrar esta ayuda

Ejemplos:
    python start_with_health_checks.py dev
    python start_with_health_checks.py production
    python start_with_health_checks.py test
    python start_with_health_checks.py disabled

Configuración por defecto:
    - Modo: startup
    - Health checks: habilitados
    - Logging: INFO
    - External checks: deshabilitados
""")

def main():
    """Función principal"""
    # Cargar variables de entorno
    load_dotenv()
    
    # Obtener argumentos
    if len(sys.argv) < 2:
        print("❌ Error: Debes especificar un entorno")
        show_help()
        sys.exit(1)
    
    environment = sys.argv[1].lower()
    
    # Configurar entorno según el argumento
    if environment in ["dev", "development"]:
        setup_development_environment()
    elif environment in ["prod", "production"]:
        setup_production_environment()
    elif environment in ["test", "testing"]:
        setup_testing_environment()
    elif environment == "disabled":
        setup_disabled_environment()
    elif environment in ["help", "-h", "--help"]:
        show_help()
        sys.exit(0)
    else:
        print(f"❌ Error: Entorno '{environment}' no reconocido")
        show_help()
        sys.exit(1)
    
    # Mostrar configuración actual
    print("\n📋 Configuración actual de health checks:")
    print(f"   Habilitado: {os.getenv('HEALTH_CHECKS_ENABLED', 'false')}")
    print(f"   Modo: {os.getenv('HEALTH_CHECKS_MODE', 'startup')}")
    print(f"   Database: {os.getenv('HEALTH_CHECK_DATABASE', 'true')}")
    print(f"   API Endpoints: {os.getenv('HEALTH_CHECK_API_ENDPOINTS', 'true')}")
    print(f"   AI Services: {os.getenv('HEALTH_CHECK_AI_SERVICES', 'true')}")
    print(f"   External: {os.getenv('HEALTH_CHECK_EXTERNAL', 'false')}")
    print(f"   System Resources: {os.getenv('HEALTH_CHECK_SYSTEM_RESOURCES', 'true')}")
    print(f"   Log Level: {os.getenv('HEALTH_LOG_LEVEL', 'INFO')}")
    print(f"   Failures Only: {os.getenv('HEALTH_LOG_FAILURES_ONLY', 'false')}")
    
    # Iniciar el servidor
    print(f"\n🚀 Iniciando servidor backend en modo '{environment}'...")
    print("   URL: http://localhost:8000")
    print("   Health Check: http://localhost:8000/health")
    print("   Config: http://localhost:8000/health/config")
    print("   Docs: http://localhost:8000/docs")
    print("\n💡 Presiona Ctrl+C para detener el servidor")
    print("=" * 60)
    
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            reload_dirs=["app"],
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido por el usuario")
    except Exception as e:
        print(f"\n❌ Error iniciando el servidor: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
