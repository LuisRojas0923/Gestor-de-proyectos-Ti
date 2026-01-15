#!/usr/bin/env python3
"""
Script para crear el Stored Procedure en la base de datos
"""

import sqlite3
import os
from pathlib import Path

def create_sp_in_database():
    """Crear el SP en la base de datos SQLite"""
    
    # Ruta a la base de datos
    db_path = "project_manager.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Base de datos no encontrada en: {db_path}")
        return False
    
    try:
        # Conectar a la base de datos
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔌 Conectado a la base de datos")
        
        # Leer el archivo SQL del SP
        sp_file = Path("sp_get_providers_from_activities.sql")
        if not sp_file.exists():
            print(f"❌ Archivo SP no encontrado: {sp_file}")
            return False
        
        with open(sp_file, 'r', encoding='utf-8') as f:
            sp_content = f.read()
        
        print("📖 Archivo SP leído correctamente")
        
        # SQLite no soporta DELIMITER, necesitamos adaptar el SP
        # Separar el SP y la función
        sp_parts = sp_content.split('DELIMITER $$')
        
        if len(sp_parts) < 3:
            print("❌ Formato de SP incorrecto")
            return False
        
        # Extraer el SP (parte 1)
        sp_sql = sp_parts[1].strip()
        sp_sql = sp_sql.replace('DELIMITER $$', '').strip()
        
        # Extraer la función (parte 2)  
        function_sql = sp_parts[2].strip()
        function_sql = function_sql.replace('DELIMITER $$', '').strip()
        function_sql = function_sql.replace('DELIMITER ;', '').strip()
        
        print("🔧 Adaptando SP para SQLite...")
        
        # Adaptar el SP para SQLite (simplificar)
        sp_sqlite = """
        CREATE VIEW IF NOT EXISTS v_providers_homologados AS
        SELECT DISTINCT 
            CASE 
                -- Homologaciones específicas
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
                
                -- Casos especiales
                WHEN d.provider IS NULL OR d.provider = '' THEN 'Sin Proveedor'
                
                -- Mantener original si no hay homologación
                ELSE TRIM(d.provider)
            END AS provider_homologado,
            COUNT(DISTINCT dal.development_id) as cantidad_desarrollos_con_actividades,
            COUNT(dal.id) as total_actividades
        FROM development_activity_log dal
        INNER JOIN developments d ON dal.development_id = d.id
        WHERE d.provider IS NOT NULL 
        GROUP BY provider_homologado
        ORDER BY provider_homologado;
        """
        
        # Crear la vista
        cursor.execute(sp_sqlite)
        print("✅ Vista de proveedores homologados creada")
        
        # Crear función de homologación como vista también
        function_sqlite = """
        CREATE VIEW IF NOT EXISTS v_provider_homologacion AS
        SELECT 
            provider_name,
            CASE 
                -- Homologaciones específicas
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
                
                -- Casos especiales
                WHEN provider_name IS NULL OR provider_name = '' THEN 'Sin Proveedor'
                
                -- Mantener original si no hay homologación
                ELSE TRIM(provider_name)
            END AS provider_homologado
        FROM (
            SELECT DISTINCT provider as provider_name FROM developments 
            WHERE provider IS NOT NULL
        );
        """
        
        cursor.execute(function_sqlite)
        print("✅ Vista de homologación creada")
        
        # Confirmar cambios
        conn.commit()
        print("💾 Cambios guardados en la base de datos")
        
        # Probar la vista
        cursor.execute("SELECT * FROM v_providers_homologados LIMIT 5")
        results = cursor.fetchall()
        
        print(f"🧪 Prueba de vista - {len(results)} proveedores encontrados:")
        for row in results:
            print(f"  - {row[0]}: {row[1]} desarrollos, {row[2]} actividades")
        
        conn.close()
        print("✅ SP/Vista creado exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error creando SP: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def test_sp_usage():
    """Probar que el SP funciona"""
    try:
        conn = sqlite3.connect("project_manager.db")
        cursor = conn.cursor()
        
        # Probar la vista
        cursor.execute("SELECT * FROM v_providers_homologados")
        results = cursor.fetchall()
        
        print(f"\n🧪 Prueba de uso - {len(results)} proveedores:")
        for row in results:
            print(f"  ✅ {row[0]}: {row[1]} desarrollos, {row[2]} actividades")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error probando SP: {e}")
        return False

if __name__ == "__main__":
    print("🚀 CREANDO STORED PROCEDURE EN BASE DE DATOS")
    print("=" * 50)
    
    if create_sp_in_database():
        print("\n🧪 PROBANDO FUNCIONAMIENTO")
        print("-" * 30)
        test_sp_usage()
    
    print("\n" + "=" * 50)
    print("🏁 PROCESO COMPLETADO")
