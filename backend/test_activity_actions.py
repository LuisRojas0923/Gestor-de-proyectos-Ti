#!/usr/bin/env python3
"""
Script de prueba para las funcionalidades de completar y eliminar actividades
"""

import requests
import json
from datetime import date

BASE_URL = "http://localhost:8000/api/v1"
DEVELOPMENT_ID = "INC000004970133"

def test_activity_actions():
    print("🧪 Probando funcionalidades de actividades...")
    
    # 1. Listar actividades existentes
    print("\n1. Listando actividades existentes...")
    response = requests.get(f"{BASE_URL}/activity-log/developments/{DEVELOPMENT_ID}/activities")
    
    if response.status_code == 200:
        activities = response.json().get('activities', [])
        print(f"✅ Encontradas {len(activities)} actividades")
        
        if activities:
            # Mostrar la primera actividad
            first_activity = activities[0]
            activity_id = first_activity['id']
            print(f"📋 Actividad de prueba: ID {activity_id}, Estado: {first_activity['status']}")
            
            # 2. Probar completar actividad (si no está completada)
            if first_activity['status'] != 'completada':
                print(f"\n2. Completando actividad {activity_id}...")
                update_data = {
                    "status": "completada",
                    "end_date": date.today().isoformat()
                }
                
                response = requests.put(
                    f"{BASE_URL}/activity-log/activities/{activity_id}",
                    json=update_data
                )
                
                if response.status_code == 200:
                    print("✅ Actividad completada exitosamente")
                    updated_activity = response.json()
                    print(f"   Nuevo estado: {updated_activity['status']}")
                    print(f"   Fecha de fin: {updated_activity['end_date']}")
                else:
                    print(f"❌ Error completando actividad: {response.status_code}")
                    print(f"   Respuesta: {response.text}")
            else:
                print(f"\n2. ⏭️  Actividad {activity_id} ya está completada, saltando...")
            
            # 3. Crear una actividad de prueba para eliminar
            print(f"\n3. Creando actividad de prueba para eliminar...")
            test_activity_data = {
                "stage_id": 2,  # Análisis
                "activity_type": "nueva_actividad",
                "start_date": date.today().isoformat(),
                "status": "pendiente",
                "actor_type": "equipo_interno",
                "notes": "Actividad de prueba para eliminar",
                "dynamic_payload": {}
            }
            
            response = requests.post(
                f"{BASE_URL}/activity-log/developments/{DEVELOPMENT_ID}/activities",
                json=test_activity_data
            )
            
            if response.status_code in [200, 201]:
                test_activity = response.json()
                test_activity_id = test_activity['id']
                print(f"✅ Actividad de prueba creada: ID {test_activity_id}")
                
                # 4. Eliminar la actividad de prueba
                print(f"\n4. Eliminando actividad de prueba {test_activity_id}...")
                response = requests.delete(f"{BASE_URL}/activity-log/activities/{test_activity_id}")
                
                if response.status_code == 200:
                    print("✅ Actividad eliminada exitosamente")
                    result = response.json()
                    print(f"   Mensaje: {result['message']}")
                else:
                    print(f"❌ Error eliminando actividad: {response.status_code}")
                    print(f"   Respuesta: {response.text}")
            else:
                print(f"❌ Error creando actividad de prueba: {response.status_code}")
                print(f"   Respuesta: {response.text}")
        else:
            print("⚠️  No hay actividades para probar")
    else:
        print(f"❌ Error listando actividades: {response.status_code}")
        print(f"   Respuesta: {response.text}")

if __name__ == "__main__":
    test_activity_actions()
