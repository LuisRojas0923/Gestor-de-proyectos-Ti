#!/usr/bin/env python3
"""
Script simple para crear las funciones en PostgreSQL
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

def create_functions():
    """Crear las funciones en PostgreSQL"""
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        print("🔌 Conectado a PostgreSQL")
        
        # Función para obtener proveedores
        function_sql = """
        CREATE OR REPLACE FUNCTION fn_get_providers_from_activities()
        RETURNS TABLE(
            provider_homologado VARCHAR(255),
            cantidad_desarrollos_con_actividades BIGINT,
            total_actividades BIGINT
        )
        LANGUAGE SQL
        AS $$
            SELECT DISTINCT 
                CASE 
                    WHEN LOWER(d.provider) LIKE '%ingesoft%' THEN 'Ingesoft'
                    WHEN LOWER(d.provider) LIKE '%oracle%' THEN 'ORACLE'
                    WHEN LOWER(d.provider) LIKE '%itc%' THEN 'ITC'
                    WHEN LOWER(d.provider) LIKE '%interno%' OR LOWER(d.provider) LIKE '%ti interno%' THEN 'TI Interno'
                    WHEN LOWER(d.provider) LIKE '%coomeva%' THEN 'Coomeva'
                    WHEN LOWER(d.provider) LIKE '%softtek%' THEN 'Softtek'
                    WHEN LOWER(d.provider) LIKE '%accenture%' THEN 'Accenture'
                    WHEN LOWER(d.provider) LIKE '%microsoft%' THEN 'Microsoft'
                    WHEN LOWER(d.provider) LIKE '%ibm%' THEN 'IBM'
                    WHEN LOWER(d.provider) LIKE '%sap%' THEN 'SAP'
                    WHEN d.provider IS NULL OR d.provider = '' THEN 'Sin Proveedor'
                    ELSE TRIM(d.provider)
                END AS provider_homologado,
                COUNT(DISTINCT dal.development_id) as cantidad_desarrollos_con_actividades,
                COUNT(dal.id) as total_actividades
            FROM development_activity_log dal
            INNER JOIN developments d ON dal.development_id = d.id
            WHERE d.provider IS NOT NULL 
            GROUP BY provider_homologado
            ORDER BY provider_homologado;
        $$;
        """
        
        cursor.execute(function_sql)
        print("✅ Función fn_get_providers_from_activities creada")
        
        # Función de homologación
        homologation_sql = """
        CREATE OR REPLACE FUNCTION fn_homologar_proveedor(provider_name VARCHAR(255))
        RETURNS VARCHAR(255)
        LANGUAGE SQL
        IMMUTABLE
        AS $$
            SELECT CASE 
                WHEN LOWER(provider_name) LIKE '%ingesoft%' THEN 'Ingesoft'
                WHEN LOWER(provider_name) LIKE '%oracle%' THEN 'ORACLE'
                WHEN LOWER(provider_name) LIKE '%itc%' THEN 'ITC'
                WHEN LOWER(provider_name) LIKE '%interno%' OR LOWER(provider_name) LIKE '%ti interno%' THEN 'TI Interno'
                WHEN LOWER(provider_name) LIKE '%coomeva%' THEN 'Coomeva'
                WHEN LOWER(provider_name) LIKE '%softtek%' THEN 'Softtek'
                WHEN LOWER(provider_name) LIKE '%accenture%' THEN 'Accenture'
                WHEN LOWER(provider_name) LIKE '%microsoft%' THEN 'Microsoft'
                WHEN LOWER(provider_name) LIKE '%ibm%' THEN 'IBM'
                WHEN LOWER(provider_name) LIKE '%sap%' THEN 'SAP'
                WHEN provider_name IS NULL OR provider_name = '' THEN 'Sin Proveedor'
                ELSE TRIM(provider_name)
            END;
        $$;
        """
        
        cursor.execute(homologation_sql)
        print("✅ Función fn_homologar_proveedor creada")
        
        conn.commit()
        print("💾 Cambios guardados")
        
        # Probar la función
        cursor.execute("SELECT * FROM fn_get_providers_from_activities()")
        results = cursor.fetchall()
        
        print(f"🧪 Prueba - {len(results)} proveedores encontrados:")
        for row in results:
            print(f"  - {row[0]}: {row[1]} desarrollos, {row[2]} actividades")
        
        cursor.close()
        conn.close()
        print("✅ Funciones creadas exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    print("🚀 CREANDO FUNCIONES EN POSTGRESQL")
    print("=" * 40)
    create_functions()
    print("🏁 COMPLETADO")
