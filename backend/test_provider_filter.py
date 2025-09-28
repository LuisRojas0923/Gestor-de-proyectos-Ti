#!/usr/bin/env python3
"""
Script de prueba para verificar el nuevo sistema de filtrado de proveedores
"""

import requests
import json
from datetime import datetime

# Configuración
BASE_URL = "http://localhost:8000"
KPI_ENDPOINT = f"{BASE_URL}/api/v1/kpi"

def test_provider_endpoint():
    """Probar el endpoint de proveedores"""
    print("🔍 Probando endpoint de proveedores...")
    
    try:
        response = requests.get(f"{KPI_ENDPOINT}/providers")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Endpoint funcionando")
            print(f"Total proveedores: {data.get('total', 0)}")
            print(f"Fuente: {data.get('source', 'unknown')}")
            print(f"Proveedores: {data.get('providers', [])}")
            
            if 'detailed_info' in data:
                print("\nInformación detallada:")
                for provider in data['detailed_info']:
                    print(f"  - {provider['name']}: {provider.get('developments_count', 0)} desarrollos, {provider.get('activities_count', 0)} actividades")
            
            return data.get('providers', [])
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return []
            
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return []

def test_dashboard_with_provider(provider):
    """Probar dashboard con un proveedor específico"""
    print(f"\n🎯 Probando dashboard con proveedor: {provider}")
    
    try:
        response = requests.get(f"{KPI_ENDPOINT}/dashboard?provider={provider}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Dashboard funcionando para {provider}")
            
            # Mostrar métricas principales
            if 'global_compliance' in data:
                compliance = data['global_compliance']
                print(f"Cumplimiento Global: {compliance.get('current_value', 0)}%")
                print(f"Cambio: {compliance.get('change_percentage', 0)}%")
            
            if 'first_time_quality' in data:
                quality = data['first_time_quality']
                print(f"Calidad Primera Entrega: {quality.get('current_value', 0)}%")
            
            if 'defects_per_delivery' in data:
                defects = data['defects_per_delivery']
                print(f"Defectos por Entrega: {defects.get('current_value', 0)}")
            
            return True
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_debug_endpoint(provider=None):
    """Probar endpoint de debug"""
    print(f"\n🐛 Probando endpoint de debug{' con proveedor: ' + provider if provider else ''}...")
    
    try:
        url = f"{KPI_ENDPOINT}/_debug/dashboard-calculation"
        if provider:
            url += f"?provider={provider}"
            
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Debug endpoint funcionando")
            print(f"📅 Período: {data.get('period', {})}")
            print(f"🔍 Filtro proveedor: {data.get('provider_filter', 'Ninguno')}")
            
            calculations = data.get('calculations', {})
            for metric, result in calculations.items():
                status = "✅" if result.get('success') else "❌"
                print(f"  {status} {metric}: {result.get('success', False)}")
                if not result.get('success'):
                    print(f"    Error: {result.get('error', 'Unknown')}")
            
            return True
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Función principal de prueba"""
    print("🚀 INICIANDO PRUEBAS DEL SISTEMA DE FILTRADO DE PROVEEDORES")
    print("=" * 60)
    
    # 1. Probar endpoint de proveedores
    providers = test_provider_endpoint()
    
    if not providers:
        print("❌ No se pudieron obtener proveedores. Verificar backend.")
        return
    
    # 2. Probar dashboard global
    print("\n🌍 Probando dashboard global...")
    test_dashboard_with_provider(None)
    
    # 3. Probar con cada proveedor
    for provider in providers[:3]:  # Probar solo los primeros 3
        test_dashboard_with_provider(provider)
    
    # 4. Probar debug endpoint
    test_debug_endpoint()
    test_debug_endpoint(providers[0] if providers else None)
    
    print("\n" + "=" * 60)
    print("🏁 PRUEBAS COMPLETADAS")

if __name__ == "__main__":
    main()
