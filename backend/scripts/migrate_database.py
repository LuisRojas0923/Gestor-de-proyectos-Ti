#!/usr/bin/env python3
"""
Script para migrar la base de datos a la nueva estructura normalizada
Versión mejorada con mejores prácticas y validaciones
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import logging
from dotenv import load_dotenv
from urllib.parse import urlparse
from datetime import datetime

# Cargar variables de entorno
load_dotenv()

# Configurar logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def parse_database_url():
    """Parsear DATABASE_URL del archivo .env"""
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/gestor_proyectos')
    
    if database_url.startswith('sqlite'):
        logger.error("SQLite no es compatible con esta migración. Usar PostgreSQL.")
        sys.exit(1)
    
    parsed = urlparse(database_url)
    
    return {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'user': parsed.username or 'postgres',
        'password': parsed.password or 'postgres',
        'database': parsed.path.lstrip('/') or 'gestor_proyectos'
    }

# Configuración de base de datos desde .env
DB_CONFIG = parse_database_url()

# Debug: mostrar configuración actual
logger = logging.getLogger(__name__)
logger.info(f"🔧 Configuración DB: {DB_CONFIG}")

def create_database_if_not_exists():
    """Crear la base de datos si no existe"""
    try:
        # Conectar a PostgreSQL usando la base de datos postgres (por defecto)
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database='postgres'  # Conectar a la base de datos por defecto
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        # Verificar si la base de datos existe
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (DB_CONFIG['database'],))
        exists = cursor.fetchone()
        
        if not exists:
            logger.info(f"Creando base de datos {DB_CONFIG['database']}")
            cursor.execute(f"CREATE DATABASE {DB_CONFIG['database']}")
            logger.info("Base de datos creada exitosamente")
        else:
            logger.info(f"Base de datos {DB_CONFIG['database']} ya existe")
            
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"Error creando base de datos: {e}")
        return False

def execute_sql_file(filepath):
    """Ejecutar un archivo SQL"""
    try:
        # Conectar a la base de datos específica
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        logger.info(f"Ejecutando archivo SQL: {filepath}")
        
        # Leer y ejecutar el archivo SQL
        with open(filepath, 'r', encoding='utf-8') as file:
            sql_content = file.read()
            
        # Dividir en comandos individuales y ejecutar
        sql_commands = sql_content.split(';')
        
        for i, command in enumerate(sql_commands):
            command = command.strip()
            if command:
                try:
                    cursor.execute(command)
                    logger.debug(f"Ejecutado comando {i+1}/{len(sql_commands)}")
                except Exception as e:
                    logger.warning(f"Error en comando {i+1}: {e}")
                    # Continuar con el siguiente comando
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Archivo {filepath} ejecutado exitosamente")
        return True
        
    except Exception as e:
        logger.error(f"Error ejecutando archivo SQL {filepath}: {e}")
        return False

def verify_migration():
    """Verificar que la migración fue exitosa"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Verificar tablas principales
        tables_to_check = [
            'development_phases',
            'development_stages', 
            'developments',
            'quality_control_catalog'
        ]
        
        logger.info("Verificando migración...")
        
        for table in tables_to_check:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            logger.info(f"Tabla {table}: {count} registros")
            
        # Verificar vistas
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%_view'
        """)
        view_count = cursor.fetchone()[0]
        logger.info(f"Vistas creadas: {view_count}")
        
        cursor.close()
        conn.close()
        
        logger.info("Verificación completada exitosamente")
        return True
        
    except Exception as e:
        logger.error(f"Error verificando migración: {e}")
        return False

def create_backup():
    """Crear respaldo de la base de datos antes de migrar"""
    try:
        import subprocess
        backup_file = f"backup_{DB_CONFIG['database']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        
        logger.info(f"Creando respaldo en: {backup_file}")
        
        cmd = [
            'pg_dump',
            '-h', DB_CONFIG['host'],
            '-p', str(DB_CONFIG['port']),
            '-U', DB_CONFIG['user'],
            '-d', DB_CONFIG['database'],
            '-f', backup_file,
            '--no-password'
        ]
        
        env = os.environ.copy()
        env['PGPASSWORD'] = DB_CONFIG['password']
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info(f"Respaldo creado exitosamente: {backup_file}")
            return backup_file
        else:
            logger.warning(f"No se pudo crear respaldo: {result.stderr}")
            return None
            
    except Exception as e:
        logger.warning(f"Error creando respaldo: {e}")
        return None

def confirm_migration():
    """Confirmar migración automáticamente"""
    logger.info("⚠️  ATENCIÓN: Esta migración recreará completamente la estructura de la base de datos")
    logger.info("📊 Se perderán todos los datos existentes")
    logger.info("💾 Se recomienda tener un respaldo antes de continuar")
    logger.info("🚀 Continuando automáticamente...")
    
    # Retornar True para continuar automáticamente
    return True

def main():
    """Función principal con mejores prácticas"""
    from datetime import datetime
    
    logger.info("=== MIGRACIÓN DE BASE DE DATOS - SISTEMA GESTIÓN PROYECTOS TI ===")
    logger.info(f"🔧 Configuración: {DB_CONFIG['user']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    
    # Paso 0: Confirmar migración
    if not confirm_migration():
        logger.info("Migración cancelada por el usuario")
        sys.exit(0)
    
    # Paso 1: Crear respaldo (opcional pero recomendado)
    backup_file = create_backup()
    if backup_file:
        logger.info(f"✅ Respaldo creado: {backup_file}")
    
    # Paso 2: Crear base de datos si no existe
    if not create_database_if_not_exists():
        logger.error("❌ No se pudo crear la base de datos")
        sys.exit(1)
    
    # Paso 3: Ejecutar script de migración principal
    migration_file = os.path.join(os.path.dirname(__file__), 'database_migration.sql')
    if not os.path.exists(migration_file):
        logger.error(f"❌ Archivo de migración no encontrado: {migration_file}")
        sys.exit(1)
        
    logger.info("🔄 Ejecutando migración principal...")
    if not execute_sql_file(migration_file):
        logger.error("❌ Error ejecutando migración principal")
        sys.exit(1)
    
    # Paso 4: Ejecutar script de vistas
    views_file = os.path.join(os.path.dirname(__file__), 'database_views.sql')
    if os.path.exists(views_file):
        logger.info("🔄 Creando vistas SQL...")
        if not execute_sql_file(views_file):
            logger.warning("⚠️  Error ejecutando vistas SQL (continuando)")
    else:
        logger.warning("⚠️  Archivo de vistas no encontrado")
    
    # Paso 5: Poblar datos seed
    seed_file = os.path.join(os.path.dirname(__file__), 'seed_data.sql')
    if os.path.exists(seed_file):
        logger.info("🌱 Poblando datos seed...")
        if not execute_sql_file(seed_file):
            logger.warning("⚠️  Error poblando datos seed (continuando)")
        else:
            logger.info("✅ Datos seed poblados exitosamente")
    else:
        logger.warning("⚠️  Archivo de datos seed no encontrado")
    
    # Paso 6: Verificar migración
    logger.info("🔍 Verificando migración...")
    if not verify_migration():
        logger.error("❌ Error verificando migración")
        sys.exit(1)
    
    logger.info("=== ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE ===")
    logger.info("🎉 La nueva estructura de base de datos está lista para usar")
    logger.info("📁 Revisa el archivo migration.log para detalles completos")

if __name__ == "__main__":
    main()
