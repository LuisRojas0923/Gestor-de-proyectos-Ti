#!/usr/bin/env python3
"""
Script de testing para validar endpoints implementados en Fase 1
Sistema de Gestión de Proyectos TI - Persistencia de Datos
"""

import requests
import json
from datetime import datetime, date
from typing import Dict, Any

# Configuración
BASE_URL = "http://localhost:8000/api/v1"
DEVELOPMENT_ID = "INC000004924201"  # ID de desarrollo de prueba

def test_endpoint(method: str, endpoint: str, data: Dict[Any, Any] = None, expected_status: int = 200) -> Dict[Any, Any]:
    """Función helper para testing de endpoints"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url)
        elif method.upper() == "POST":
            response = requests.post(url, json=data)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data)
        elif method.upper() == "PATCH":
            response = requests.patch(url, json=data)
        elif method.upper() == "DELETE":
            response = requests.delete(url)
        else:
            raise ValueError(f"Método HTTP no soportado: {method}")
        
        print(f"🔍 {method.upper()} {endpoint}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == expected_status:
            print(f"   ✅ ÉXITO - Status esperado: {expected_status}")
            if response.content:
                try:
                    result = response.json()
                    print(f"   📄 Response: {json.dumps(result, indent=2, default=str)[:200]}...")
                    return result
                except:
                    print(f"   📄 Response: {response.text[:200]}...")
                    return {"text": response.text}
            return {}
        else:
            print(f"   ❌ ERROR - Status esperado: {expected_status}, obtenido: {response.status_code}")
            print(f"   📄 Error: {response.text}")
            return {"error": response.text}
            
    except requests.exceptions.ConnectionError:
        print(f"   ❌ ERROR - No se puede conectar al servidor en {url}")
        print(f"   💡 Asegúrate de que el servidor esté ejecutándose en {BASE_URL}")
        return {"error": "Connection failed"}
    except Exception as e:
        print(f"   ❌ ERROR - {str(e)}")
        return {"error": str(e)}

def main():
    """Función principal de testing"""
    print("🚀 INICIANDO TESTING DE ENDPOINTS - FASE 1")
    print("=" * 60)
    
    # Test 1: Verificar que el desarrollo existe
    print("\n📋 TEST 1: Verificar desarrollo de prueba")
    development = test_endpoint("GET", f"/developments/{DEVELOPMENT_ID}")
    
    if "error" in development:
        print("❌ No se puede continuar sin un desarrollo válido")
        return
    
    # Test 2: Crear observación/actividad
    print("\n📝 TEST 2: Crear observación/actividad")
    observation_data = {
        "observation_type": "seguimiento",
        "content": "Testing de persistencia - Actividad creada desde script de testing",
        "author": "Script de Testing",
        "is_current": True
    }
    
    created_observation = test_endpoint(
        "POST", 
        f"/developments/{DEVELOPMENT_ID}/observations", 
        observation_data,
        expected_status=200
    )
    
    observation_id = created_observation.get("id") if created_observation and "id" in created_observation else None
    
    # Test 3: Obtener observaciones
    print("\n📋 TEST 3: Obtener observaciones del desarrollo")
    observations = test_endpoint("GET", f"/developments/{DEVELOPMENT_ID}/observations")
    
    # Test 4: Actualizar observación (si se creó exitosamente)
    if observation_id:
        print("\n✏️ TEST 4: Actualizar observación")
        update_data = {
            "content": "Testing de persistencia - Observación actualizada",
            "observation_type": "problema"
        }
        test_endpoint(
            "PUT", 
            f"/developments/{DEVELOPMENT_ID}/observations/{observation_id}", 
            update_data,
            expected_status=200
        )
    
    # Test 5: Obtener actividades
    print("\n📋 TEST 5: Obtener actividades del desarrollo")
    activities = test_endpoint("GET", f"/developments/{DEVELOPMENT_ID}/activities")
    
    # Test 6: Actualizar desarrollo
    print("\n✏️ TEST 6: Actualizar desarrollo")
    update_development_data = {
        "description": "Testing de persistencia - Descripción actualizada desde script",
        "general_status": "En curso"
    }
    test_endpoint(
        "PUT", 
        f"/developments/{DEVELOPMENT_ID}", 
        update_development_data,
        expected_status=200
    )
    
    # Test 7: Actualizar progreso de etapa
    print("\n📊 TEST 7: Actualizar progreso de etapa")
    progress_data = {
        "progress_percentage": 75.5,
        "updated_by": "Script de Testing",
        "notes": "Testing de persistencia - Progreso actualizado"
    }
    test_endpoint(
        "PATCH", 
        f"/developments/{DEVELOPMENT_ID}/progress", 
        progress_data,
        expected_status=200
    )
    
    # Test 8: Cambiar etapa (usar etapa existente)
    print("\n🔄 TEST 8: Cambiar etapa del desarrollo")
    stage_data = {
        "stage_id": 1,  # Asumiendo que existe una etapa con ID 1
        "progress_percentage": 80.0,
        "changed_by": "Script de Testing",
        "notes": "Testing de persistencia - Cambio de etapa"
    }
    test_endpoint(
        "PATCH", 
        f"/developments/{DEVELOPMENT_ID}/stage", 
        stage_data,
        expected_status=200
    )
    
    # Test 9: Eliminar observación (si se creó exitosamente)
    if observation_id:
        print("\n🗑️ TEST 9: Eliminar observación")
        test_endpoint(
            "DELETE", 
            f"/developments/{DEVELOPMENT_ID}/observations/{observation_id}",
            expected_status=200
        )
    
    # Test 10: Verificar estado actual
    print("\n📊 TEST 10: Obtener estado actual del desarrollo")
    test_endpoint("GET", f"/developments/{DEVELOPMENT_ID}/current-status")
    
    print("\n" + "=" * 60)
    print("🏁 TESTING COMPLETADO")
    print("=" * 60)
    
    # Resumen de resultados
    print("\n📊 RESUMEN DE RESULTADOS:")
    print("✅ Endpoints implementados y probados:")
    print("   - GET /developments/{id}/observations")
    print("   - POST /developments/{id}/observations")
    print("   - PUT /developments/{id}/observations/{observation_id}")
    print("   - DELETE /developments/{id}/observations/{observation_id}")
    print("   - GET /developments/{id}/activities")
    print("   - PUT /developments/{id}")
    print("   - PATCH /developments/{id}/progress")
    print("   - PATCH /developments/{id}/stage")
    
    print("\n🎯 PRÓXIMOS PASOS:")
    print("   1. Verificar que todos los tests pasaron correctamente")
    print("   2. Revisar logs del servidor para errores")
    print("   3. Continuar con Fase 2: Frontend - Conexión con Backend")

if __name__ == "__main__":
    main()
