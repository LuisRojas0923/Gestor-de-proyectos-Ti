#!/usr/bin/env python3
"""
Script simple para crear todas las tablas usando SQLAlchemy
"""

import os
import sys
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def create_tables():
    """Crear todas las tablas usando SQLAlchemy models"""
    try:
        # Importar después de agregar al path
        from app.database import engine, Base
        from app import models  # Importar todos los modelos
        
        print("🔧 Creando todas las tablas usando SQLAlchemy...")
        Base.metadata.create_all(bind=engine)
        print("✅ Todas las tablas creadas exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error creando tablas: {e}")
        return False

def verify_tables():
    """Verificar que las tablas se crearon correctamente"""
    try:
        from app.database import engine
        from sqlalchemy import inspect
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"📊 Tablas existentes en la base de datos: {len(tables)}")
        for table in sorted(tables):
            print(f"  - {table}")
        
        # Verificar tablas críticas
        critical_tables = [
            'developments', 'development_phases', 'development_stages',
            'auth_users', 'quality_control_catalog', 'development_kpi_metrics'
        ]
        
        missing_tables = [table for table in critical_tables if table not in tables]
        if missing_tables:
            print(f"⚠️ Tablas críticas faltantes: {missing_tables}")
            return False
        else:
            print("✅ Todas las tablas críticas están presentes")
            return True
            
    except Exception as e:
        print(f"❌ Error verificando tablas: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando creación de tablas...")
    
    if create_tables():
        if verify_tables():
            print("✅ Base de datos configurada exitosamente")
            return True
    
    print("❌ No se pudo configurar la base de datos")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
