#!/usr/bin/env python3
"""
Script para configurar el entorno de desarrollo
"""

import os
import shutil
from pathlib import Path

def create_env_file():
    """Crear archivo .env desde env.example"""
    project_root = Path(__file__).parent
    env_example = project_root / "env.example"
    env_file = project_root / ".env"
    
    if env_file.exists():
        print("✅ Archivo .env ya existe")
        return True
    
    if not env_example.exists():
        print("❌ Archivo env.example no encontrado")
        return False
    
    try:
        # Leer env.example y corregir el error tipográfico
        with open(env_example, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Corregir error tipográfico: posgresql -> postgresql
        content = content.replace('posgresql://', 'postgresql://')
        
        # Escribir archivo .env
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ Archivo .env creado exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error creando archivo .env: {e}")
        return False

def install_dependencies():
    """Instalar dependencias de Python"""
    try:
        import subprocess
        import sys
        
        print("📦 Instalando dependencias de Python...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Dependencias instaladas exitosamente")
            return True
        else:
            print(f"❌ Error instalando dependencias: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error instalando dependencias: {e}")
        return False

def main():
    """Función principal"""
    print("🔧 Configurando entorno de desarrollo...")
    
    # Crear archivo .env
    if not create_env_file():
        return False
    
    # Instalar dependencias
    if not install_dependencies():
        return False
    
    print("\n✅ Entorno configurado exitosamente")
    print("\n📋 Próximos pasos:")
    print("1. Ejecutar: python fix_database.py")
    print("2. Ejecutar: python -m uvicorn app.main:app --reload")
    
    return True

if __name__ == "__main__":
    main()
