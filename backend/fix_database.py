#!/usr/bin/env python3
"""
Script para corregir la base de datos y crear todas las tablas faltantes
"""

import os
import sys
from pathlib import Path

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_url():
    """Obtener URL de base de datos desde variables de entorno o usar default"""
    return os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/project_manager")

def create_all_tables():
    """Crear todas las tablas usando SQLAlchemy models"""
    try:
        from app.database import engine, Base
        from app import models  # Importar todos los modelos
        
        logger.info("🔧 Creando todas las tablas usando SQLAlchemy...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Todas las tablas creadas exitosamente")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creando tablas con SQLAlchemy: {e}")
        return False

def run_sql_migration():
    """Ejecutar migración SQL completa"""
    try:
        database_url = get_database_url()
        engine = create_engine(database_url)
        
        # Leer archivo de migración SQL
        migration_file = project_root / "database_migration.sql"
        if not migration_file.exists():
            logger.error(f"❌ Archivo de migración no encontrado: {migration_file}")
            return False
        
        logger.info(f"📖 Leyendo archivo de migración: {migration_file}")
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Dividir en statements individuales
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        logger.info(f"🚀 Ejecutando {len(statements)} statements SQL...")
        
        with engine.connect() as conn:
            for i, statement in enumerate(statements, 1):
                if statement.upper().startswith(('CREATE', 'DROP', 'ALTER', 'INSERT')):
                    try:
                        conn.execute(text(statement))
                        logger.info(f"  ✅ Statement {i}/{len(statements)} ejecutado")
                    except SQLAlchemyError as e:
                        logger.warning(f"  ⚠️ Statement {i} falló (puede ser normal): {e}")
            
            conn.commit()
        
        logger.info("✅ Migración SQL completada exitosamente")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error ejecutando migración SQL: {e}")
        return False

def verify_tables():
    """Verificar que las tablas se crearon correctamente"""
    try:
        database_url = get_database_url()
        engine = create_engine(database_url)
        
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        logger.info(f"📊 Tablas existentes en la base de datos: {len(tables)}")
        for table in sorted(tables):
            logger.info(f"  - {table}")
        
        # Verificar tablas críticas
        critical_tables = [
            'developments', 'development_phases', 'development_stages',
            'auth_users', 'quality_control_catalog', 'development_kpi_metrics'
        ]
        
        missing_tables = [table for table in critical_tables if table not in tables]
        if missing_tables:
            logger.warning(f"⚠️ Tablas críticas faltantes: {missing_tables}")
            return False
        else:
            logger.info("✅ Todas las tablas críticas están presentes")
            return True
            
    except Exception as e:
        logger.error(f"❌ Error verificando tablas: {e}")
        return False

def main():
    """Función principal"""
    logger.info("🚀 Iniciando corrección de base de datos...")
    
    # Método 1: Usar SQLAlchemy models
    logger.info("\n📋 Método 1: Creando tablas con SQLAlchemy models")
    if create_all_tables():
        if verify_tables():
            logger.info("✅ Base de datos corregida exitosamente con SQLAlchemy")
            return
    
    # Método 2: Usar migración SQL
    logger.info("\n📋 Método 2: Ejecutando migración SQL completa")
    if run_sql_migration():
        if verify_tables():
            logger.info("✅ Base de datos corregida exitosamente con migración SQL")
            return
    
    logger.error("❌ No se pudo corregir la base de datos")
    sys.exit(1)

if __name__ == "__main__":
    main()
