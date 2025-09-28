#!/usr/bin/env python3
"""
Script para crear el Stored Procedure en PostgreSQL
"""

import psycopg2
import os
from dotenv import load_dotenv
from pathlib import Path

# Cargar variables de entorno
load_dotenv('.env')

def get_db_connection():
    """Obtener conexión a PostgreSQL"""
    try:
        # URL de conexión desde variables de entorno
        database_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/project_manager")
        
        # Parsear la URL para psycopg2
        if database_url.startswith("postgresql://"):
            # Formato: postgresql://user:password@host:port/database
            url_parts = database_url.replace("postgresql://", "").split("/")
            db_name = url_parts[-1]
            auth_host = url_parts[-2].split("@")
            
            if len(auth_host) == 2:
                auth, host_port = auth_host
                user, password = auth.split(":")
                host, port = host_port.split(":")
            else:
                # Sin autenticación
                host, port = auth_host[0].split(":")
                user = password = None
            
            conn = psycopg2.connect(
                host=host,
                port=int(port),
                database=db_name,
                user=user,
                password=password
            )
        else:
            # Formato directo
            conn = psycopg2.connect(database_url)
        
        return conn
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        return None

def create_sp_in_postgresql():
    """Crear el SP en PostgreSQL"""
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        print("🔌 Conectado a PostgreSQL")
        
        # Leer el archivo SQL del SP
        sp_file = Path("sp_get_providers_from_activities_postgresql_v2.sql")
        if not sp_file.exists():
            print(f"❌ Archivo SP no encontrado: {sp_file}")
            return False
        
        with open(sp_file, 'r', encoding='utf-8') as f:
            sp_content = f.read()
        
        print("📖 Archivo SP leído correctamente")
        
        # Separar el SP y la función por comentarios
        sp_parts = sp_content.split('-- Crear el SP')
        
        if len(sp_parts) < 2:
            print("❌ Formato de SP incorrecto")
            return False
        
        # Extraer el SP (parte 1)
        sp_sql = sp_parts[1].split('-- =====================================================')[0].strip()
        
        # Extraer la función (parte 2)
        function_parts = sp_content.split('-- Crear el SP')
        if len(function_parts) >= 2:
            function_sql = function_parts[1].split('CREATE OR REPLACE FUNCTION')[1].strip()
        else:
            function_sql = None
        
        print("🔧 Creando funciones en PostgreSQL...")
        
        # Ejecutar todo el SQL de una vez
        cursor.execute(sp_content)
        print("✅ Funciones creadas")
        
        # Confirmar cambios
        conn.commit()
        print("💾 Cambios guardados en PostgreSQL")
        
        # Probar la función
        try:
            cursor.execute("SELECT * FROM fn_get_providers_from_activities()")
            results = cursor.fetchall()
            print(f"🧪 Prueba de función - {len(results)} proveedores encontrados:")
            for row in results:
                print(f"  - {row[0]}: {row[1]} desarrollos, {row[2]} actividades")
        except Exception as e:
            print(f"⚠️ Función creada pero no se puede probar: {e}")
            results = []
        
        cursor.close()
        conn.close()
        print("✅ SP creado exitosamente en PostgreSQL")
        return True
        
    except Exception as e:
        print(f"❌ Error creando SP: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def test_sp_usage():
    """Probar que el SP funciona"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Probar el SP
        cursor.execute("CALL sp_get_providers_from_activities()")
        results = cursor.fetchall()
        
        print(f"\n🧪 Prueba de uso - {len(results)} proveedores:")
        for row in results:
            print(f"  ✅ {row[0]}: {row[1]} desarrollos, {row[2]} actividades")
        
        # Probar la función
        cursor.execute("SELECT fn_homologar_proveedor('Ingesoft Colombia') as homologado")
        result = cursor.fetchone()
        print(f"  🧪 Función homologación: 'Ingesoft Colombia' -> '{result[0]}'")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error probando SP: {e}")
        return False

if __name__ == "__main__":
    print("🚀 CREANDO STORED PROCEDURE EN POSTGRESQL")
    print("=" * 50)
    
    if create_sp_in_postgresql():
        print("\n🧪 PROBANDO FUNCIONAMIENTO")
        print("-" * 30)
        test_sp_usage()
    
    print("\n" + "=" * 50)
    print("🏁 PROCESO COMPLETADO")
