#!/usr/bin/env python3
"""
Script para configurar el entorno de desarrollo
Instala dependencias y verifica configuración
"""

import os
import sys
import subprocess
import pkg_resources
from pathlib import Path

def check_python_version():
    """Verificar versión de Python"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Error: Se requiere Python 3.8 o superior")
        print(f"   Versión actual: {version.major}.{version.minor}.{version.micro}")
        return False
    
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} - OK")
    return True

def install_dependencies():
    """Instalar dependencias de requirements.txt"""
    requirements_file = Path(__file__).parent / "requirements.txt"
    
    if not requirements_file.exists():
        print("❌ Error: Archivo requirements.txt no encontrado")
        return False
    
    try:
        print("📦 Instalando dependencias...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ], capture_output=True, text=True, check=True)
        
        print("✅ Dependencias instaladas exitosamente")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error instalando dependencias: {e}")
        print(f"   Salida: {e.stdout}")
        print(f"   Error: {e.stderr}")
        return False

def check_postgresql():
    """Verificar disponibilidad de PostgreSQL"""
    try:
        result = subprocess.run([
            "pg_config", "--version"
        ], capture_output=True, text=True, check=True)
        
        print(f"✅ PostgreSQL disponible: {result.stdout.strip()}")
        return True
        
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  PostgreSQL no encontrado en PATH")
        print("   Instala PostgreSQL o verifica que esté en PATH")
        return False

def create_env_file():
    """Crear archivo .env si no existe"""
    env_file = Path(__file__).parent / ".env"
    env_example = Path(__file__).parent / "env.example"
    
    if env_file.exists():
        print("✅ Archivo .env ya existe")
        return True
    
    if not env_example.exists():
        print("❌ Archivo env.example no encontrado")
        return False
    
    try:
        # Copiar env.example a .env
        with open(env_example, 'r') as source:
            content = source.read()
        
        # Actualizar para PostgreSQL
        content = content.replace(
            "DATABASE_URL=sqlite:///./project_manager.db",
            "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gestor_proyectos"
        )
        
        with open(env_file, 'w') as target:
            target.write(content)
        
        print("✅ Archivo .env creado desde env.example")
        print("⚠️  IMPORTANTE: Edita .env con tus configuraciones reales")
        return True
        
    except Exception as e:
        print(f"❌ Error creando archivo .env: {e}")
        return False

def verify_dependencies():
    """Verificar que las dependencias críticas estén instaladas"""
    critical_packages = [
        "fastapi",
        "sqlalchemy", 
        "psycopg2-binary",
        "alembic",
        "python-dotenv"
    ]
    
    missing = []
    for package in critical_packages:
        try:
            pkg_resources.get_distribution(package)
            print(f"✅ {package} - instalado")
        except pkg_resources.DistributionNotFound:
            print(f"❌ {package} - faltante")
            missing.append(package)
    
    if missing:
        print(f"\n❌ Dependencias faltantes: {', '.join(missing)}")
        return False
    
    print("✅ Todas las dependencias críticas están instaladas")
    return True

def main():
    """Función principal"""
    print("🚀 CONFIGURACIÓN DEL ENTORNO - SISTEMA GESTIÓN PROYECTOS TI")
    print("=" * 60)
    
    success = True
    
    # Verificar Python
    if not check_python_version():
        success = False
    
    # Instalar dependencias
    if not install_dependencies():
        success = False
    
    # Verificar dependencias críticas
    if not verify_dependencies():
        success = False
    
    # Verificar PostgreSQL
    if not check_postgresql():
        print("⚠️  Continuando sin PostgreSQL (necesario para producción)")
    
    # Crear archivo .env
    if not create_env_file():
        success = False
    
    print("\n" + "=" * 60)
    
    if success:
        print("✅ ENTORNO CONFIGURADO EXITOSAMENTE")
        print("\n📋 PRÓXIMOS PASOS:")
        print("1. Edita el archivo .env con tus configuraciones")
        print("2. Asegúrate de que PostgreSQL esté ejecutándose")
        print("3. Ejecuta: python migrate_database.py")
        print("4. Inicia el servidor: python -m app.main")
    else:
        print("❌ CONFIGURACIÓN INCOMPLETA")
        print("   Revisa los errores anteriores y vuelve a ejecutar")
        sys.exit(1)

if __name__ == "__main__":
    main()
