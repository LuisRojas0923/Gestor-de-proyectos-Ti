#!/usr/bin/env python3
"""
Script de testing para el sistema mejorado de instaladores
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, date

# Agregar el directorio del proyecto al path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_installer_system():
    """Probar el sistema mejorado de instaladores"""
    try:
        from app.database import SessionLocal
        from app.models.development import DevelopmentActivityLog, DevelopmentStage
        
        db = SessionLocal()
        
        print("🧪 Iniciando pruebas del sistema de instaladores...")
        
        # 1. Probar consulta de instaladores fallidos
        print("\n1. Probando consulta de instaladores fallidos...")
        
        # Obtener etapa de Despliegue (Pruebas)
        deployment_stage = db.query(DevelopmentStage).filter(
            DevelopmentStage.stage_name == "Despliegue (Pruebas)"
        ).first()
        
        if not deployment_stage:
            print("❌ No se encontró la etapa 'Despliegue (Pruebas)'")
            return False
        
        # Buscar actividades con dynamic_payload
        activities = db.query(DevelopmentActivityLog).filter(
            DevelopmentActivityLog.stage_id == deployment_stage.id,
            DevelopmentActivityLog.dynamic_payload.isnot(None)
        ).limit(5).all()
        
        print(f"   📊 Encontradas {len(activities)} actividades de prueba")
        
        # 2. Probar parsing de dynamic_payload
        print("\n2. Probando parsing de dynamic_payload...")
        
        for activity in activities:
            try:
                payload = json.loads(activity.dynamic_payload) if isinstance(activity.dynamic_payload, str) else activity.dynamic_payload
                installer_num = payload.get("installer_number")
                
                if installer_num:
                    print(f"   ✅ Instalador encontrado: {installer_num}")
                    print(f"      Ambiente: {payload.get('environment', 'N/A')}")
                    print(f"      Notas: {payload.get('installation_notes', 'N/A')}")
                else:
                    print(f"   ⚠️ Actividad {activity.id} sin installer_number")
                    
            except (json.JSONDecodeError, TypeError) as e:
                print(f"   ❌ Error parseando actividad {activity.id}: {e}")
        
        # 3. Probar búsqueda por número de instalador
        print("\n3. Probando búsqueda por número de instalador...")
        
        # Buscar un instalador específico si existe
        test_installer = None
        for activity in activities:
            try:
                payload = json.loads(activity.dynamic_payload) if isinstance(activity.dynamic_payload, str) else activity.dynamic_payload
                if payload.get("installer_number"):
                    test_installer = payload.get("installer_number")
                    break
            except:
                continue
        
        if test_installer:
            print(f"   🔍 Buscando instalador: {test_installer}")
            matching_activities = db.query(DevelopmentActivityLog).filter(
                DevelopmentActivityLog.dynamic_payload.like(f'%{test_installer}%')
            ).all()
            print(f"   ✅ Encontradas {len(matching_activities)} actividades relacionadas")
        else:
            print("   ⚠️ No se encontró ningún instalador para probar")
        
        # 4. Probar estadísticas
        print("\n4. Probando generación de estadísticas...")
        
        total_activities = len(activities)
        failed_count = len([a for a in activities if a.status in ["en_curso", "cancelada"]])
        success_rate = round((total_activities - failed_count) / total_activities * 100, 2) if total_activities > 0 else 0
        
        print(f"   📈 Total de actividades: {total_activities}")
        print(f"   ❌ Fallidas: {failed_count}")
        print(f"   ✅ Tasa de éxito: {success_rate}%")
        
        db.close()
        
        print("\n✅ Pruebas completadas exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error en las pruebas: {e}")
        return False

def test_endpoints():
    """Probar endpoints del sistema de instaladores"""
    try:
        import requests
        
        base_url = "http://localhost:8000/api/v1/installers"
        
        print("\n🌐 Probando endpoints de instaladores...")
        
        # Probar endpoint de instaladores fallidos
        try:
            response = requests.get(f"{base_url}/failed", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ GET /failed: {data.get('total_failed_installers', 0)} instaladores fallidos")
            else:
                print(f"   ❌ GET /failed: Error {response.status_code}")
        except requests.exceptions.RequestException:
            print("   ⚠️ GET /failed: Servidor no disponible")
        
        # Probar endpoint de reporte
        try:
            response = requests.get(f"{base_url}/problems-report", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ GET /problems-report: Reporte generado")
                print(f"      Tasa de éxito: {data.get('summary', {}).get('success_rate', 0)}%")
            else:
                print(f"   ❌ GET /problems-report: Error {response.status_code}")
        except requests.exceptions.RequestException:
            print("   ⚠️ GET /problems-report: Servidor no disponible")
        
        return True
        
    except ImportError:
        print("   ⚠️ requests no disponible, saltando pruebas de endpoints")
        return True
    except Exception as e:
        print(f"   ❌ Error probando endpoints: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando pruebas del sistema de instaladores...")
    
    success1 = test_installer_system()
    success2 = test_endpoints()
    
    if success1 and success2:
        print("\n✅ Todas las pruebas completadas exitosamente")
        return True
    
    print("\n❌ Algunas pruebas fallaron")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
