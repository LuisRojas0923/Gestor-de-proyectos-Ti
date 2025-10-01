#!/usr/bin/env python3
"""
Script para probar la conexión a la base de datos y verificar datos
"""

import requests
import json
import sys

def test_endpoint(url, name):
    """Probar un endpoint específico"""
    try:
        print(f"🔍 Probando {name}: {url}")
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {name}: OK - {len(data) if isinstance(data, list) else 'OK'}")
            if isinstance(data, list) and len(data) > 0:
                print(f"   📊 Datos encontrados: {len(data)} registros")
                if len(data) > 0:
                    print(f"   📋 Ejemplo: {json.dumps(data[0], indent=2, default=str)[:200]}...")
            return True
        else:
            print(f"❌ {name}: Error {response.status_code}")
            print(f"   📄 Respuesta: {response.text[:200]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ {name}: Error de conexión - {str(e)}")
        return False
    except Exception as e:
        print(f"❌ {name}: Error inesperado - {str(e)}")
        return False

def main():
    """Función principal"""
    print("🚀 INICIANDO PRUEBAS DE ENDPOINTS")
    print("=" * 50)
    
    base_url = "http://localhost:8000/api/v1"
    
    endpoints = [
        (f"{base_url}/phases/", "Fases del Desarrollo"),
        (f"{base_url}/stages/", "Etapas del Desarrollo"),
        (f"{base_url}/developments/", "Desarrollos"),
        (f"{base_url}/quality/catalog", "Catálogo de Controles de Calidad"),
        (f"{base_url}/kpi/dashboard", "Dashboard de KPIs"),
        (f"{base_url}/alerts/dashboard", "Dashboard de Alertas"),
    ]
    
    results = []
    
    for url, name in endpoints:
        result = test_endpoint(url, name)
        results.append(result)
        print()
    
    print("=" * 50)
    print("📊 RESUMEN DE RESULTADOS:")
    
    successful = sum(results)
    total = len(results)
    
    print(f"✅ Exitosos: {successful}/{total}")
    print(f"❌ Fallidos: {total - successful}/{total}")
    
    if successful == total:
        print("🎉 ¡TODOS LOS ENDPOINTS FUNCIONAN CORRECTAMENTE!")
        return 0
    else:
        print("⚠️  ALGUNOS ENDPOINTS NECESITAN ATENCIÓN")
        return 1

if __name__ == "__main__":
    sys.exit(main())
