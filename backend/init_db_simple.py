#!/usr/bin/env python3
"""
Script simple para inicializar la base de datos SQLite
"""

import os
import sys
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def init_database():
    """Inicializar base de datos SQLite"""
    try:
        # Importar después de agregar al path
        from app.database import engine, Base
        from app import models  # Importar todos los modelos
        
        print("🔧 Inicializando base de datos SQLite...")
        
        # Crear todas las tablas
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas creadas exitosamente")
        
        # Verificar que las tablas se crearon
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"📋 Tablas creadas: {len(tables)}")
        for table in tables:
            print(f"   ✅ {table}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error inicializando base de datos: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando inicialización de base de datos...")
    
    if init_database():
        print("✅ Base de datos inicializada exitosamente")
        return True
    
    print("❌ No se pudo inicializar la base de datos")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
