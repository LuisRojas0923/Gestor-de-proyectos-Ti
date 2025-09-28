#!/usr/bin/env python3
"""
Script para probar las funciones directamente desde Python
"""

import psycopg2
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv('.env')

def get_db_connection():
    """Obtener conexión a PostgreSQL"""
    try:
        database_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/project_manager")
        
        if database_url.startswith("postgresql://"):
            url_parts = database_url.replace("postgresql://", "").split("/")
            db_name = url_parts[-1]
            auth_host = url_parts[-2].split("@")
            
            if len(auth_host) == 2:
                auth, host_port = auth_host
                user, password = auth.split(":")
                host, port = host_port.split(":")
            else:
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
            conn = psycopg2.connect(database_url)
        
        return conn
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return None

def test_providers_function():
    """Probar la función de proveedores"""
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 PROBANDO FUNCIÓN: fn_get_providers_from_activities()")
        print("-" * 60)
        
        cursor.execute("SELECT * FROM fn_get_providers_from_activities()")
        results = cursor.fetchall()
        
        print(f"📊 Total proveedores encontrados: {len(results)}")
        print()
        
        for row in results:
            provider, developments, activities = row
            print(f"🏢 {provider}:")
            print(f"   📁 Desarrollos: {developments}")
            print(f"   📋 Actividades: {activities}")
            print()
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

def test_homologation_function():
    """Probar la función de homologación"""
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 PROBANDO FUNCIÓN: fn_homologar_proveedor()")
        print("-" * 60)
        
        # Probar con diferentes nombres
        test_providers = [
            "Ingesoft Colombia",
            "ORACLE CORPORATION", 
            "TI Interno",
            "ITC SAS",
            "Softtek Mexico",
            "Sin Proveedor",
            "Microsoft Corp"
        ]
        
        for provider in test_providers:
            cursor.execute("SELECT fn_homologar_proveedor(%s)", (provider,))
            result = cursor.fetchone()
            homologado = result[0] if result else "NULL"
            print(f"📝 '{provider}' -> '{homologado}'")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

def test_join_verification():
    """Verificar que el JOIN funciona correctamente"""
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        print("🔍 VERIFICANDO JOIN ENTRE TABLAS")
        print("-" * 60)
        
        # Consulta manual del JOIN
        query = """
        SELECT 
            d.id as desarrollo_id,
            d.name as desarrollo_nombre,
            d.provider as proveedor_original,
            fn_homologar_proveedor(d.provider) as proveedor_homologado,
            COUNT(dal.id) as actividades_count
        FROM developments d
        INNER JOIN development_activity_log dal ON d.id = dal.development_id
        GROUP BY d.id, d.name, d.provider
        ORDER BY actividades_count DESC
        LIMIT 10;
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        print(f"📊 Top 10 desarrollos con más actividades:")
        print()
        
        for row in results:
            dev_id, dev_name, original, homologado, activities = row
            print(f"🆔 {dev_id} | {dev_name}")
            print(f"   📝 Proveedor: '{original}' -> '{homologado}'")
            print(f"   📋 Actividades: {activities}")
            print()
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    """Función principal"""
    print("🚀 PROBANDO FUNCIONES POSTGRESQL DIRECTAMENTE")
    print("=" * 70)
    print()
    
    test_providers_function()
    print()
    
    test_homologation_function()
    print()
    
    test_join_verification()
    
    print("=" * 70)
    print("🏁 PRUEBAS COMPLETADAS")

if __name__ == "__main__":
    main()
