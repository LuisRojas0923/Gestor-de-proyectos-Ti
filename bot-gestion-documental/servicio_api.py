"""
Servicio API - Llamar al servicio para obtener datos
==================================================

Archivo simple para llamar al servicio y obtener los datos de desarrollos.
"""

import requests
import json
from datetime import datetime


def llamar_servicio_remedy():
    """Llamar al servicio Remedy para obtener datos"""
    try:
        print("🔄 Llamando al servicio Remedy...")
        
        # URL del servicio (ajustar según tu configuración)
        url = "http://localhost:8000/api/v1/developments"
        
        # Hacer la petición
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Servicio respondió correctamente")
            print(f"📊 Datos recibidos: {len(data)} elementos")
            
            # Mostrar algunos datos de ejemplo
            for i, item in enumerate(data[:3]):  # Solo los primeros 3
                print(f"   {i+1}. {item}")
            
            return data
        else:
            print(f"❌ Error en servicio: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: No se puede conectar al servicio")
        print("   Verifica que el servicio esté ejecutándose en http://localhost:8000")
        return None
    except requests.exceptions.Timeout:
        print("❌ Error: Timeout al conectar con el servicio")
        return None
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return None


def verificar_endpoints():
    """Verificar qué endpoints están disponibles"""
    try:
        print("🔍 Verificando endpoints disponibles...")
        
        # Probar diferentes endpoints
        endpoints = [
            "http://localhost:8000/docs",
            "http://localhost:8000/api/v1/",
            "http://localhost:8000/api/v1/developments",
            "http://localhost:8000/api/v1/remedy",
            "http://localhost:8000/api/developments",
            "http://localhost:8000/api/remedy"
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(endpoint, timeout=5)
                print(f"✅ {endpoint} - Status: {response.status_code}")
                if response.status_code == 200:
                    print(f"   Respuesta: {response.text[:100]}...")
            except Exception as e:
                print(f"❌ {endpoint} - Error: {e}")
                
    except Exception as e:
        print(f"❌ Error verificando endpoints: {e}")


def probar_servicio():
    """Función para probar el servicio"""
    print("=" * 50)
    print("🧪 PROBANDO SERVICIO REMEDY")
    print("=" * 50)
    
    # Primero verificar endpoints
    verificar_endpoints()
    
    print("\n" + "=" * 50)
    print("🔄 INTENTANDO OBTENER DATOS")
    print("=" * 50)
    
    datos = llamar_servicio_remedy()
    
    if datos:
        print(f"\n✅ ÉXITO: Se obtuvieron {len(datos)} desarrollos")
        print("📋 Primeros 3 desarrollos:")
        for i, dev in enumerate(datos[:3]):
            print(f"   {i+1}. ID: {dev.get('id', 'N/A')} | Nombre: {dev.get('nombre', 'N/A')}")
    else:
        print("\n❌ FALLO: No se pudieron obtener los datos")
    
    print("=" * 50)


if __name__ == "__main__":
    probar_servicio()
