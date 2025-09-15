#!/usr/bin/env python3
"""
Script de prueba para el sistema de health checks
Demuestra cómo usar y configurar los health checks del backend
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, Any

class HealthCheckTester:
    """Clase para probar el sistema de health checks"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_basic_health(self) -> Dict[str, Any]:
        """Prueba el endpoint básico de health"""
        print("🔍 Probando health check básico...")
        
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Health check básico exitoso: {data.get('overall_status', 'unknown')}")
                    return data
                else:
                    print(f"❌ Health check básico falló: HTTP {response.status}")
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            print(f"❌ Error en health check básico: {e}")
            return {"error": str(e)}
    
    async def test_forced_health_check(self) -> Dict[str, Any]:
        """Prueba el health check forzado"""
        print("🔍 Probando health check forzado...")
        
        try:
            start_time = time.time()
            async with self.session.get(f"{self.base_url}/health?force_check=true") as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Health check forzado exitoso en {response_time:.2f}s")
                    print(f"   Estado general: {data.get('overall_status', 'unknown')}")
                    
                    summary = data.get('summary', {})
                    print(f"   Checks ejecutados: {summary.get('total_checks', 0)}")
                    print(f"   Checks exitosos: {summary.get('passed_checks', 0)}")
                    print(f"   Checks fallidos: {summary.get('failed_checks', 0)}")
                    print(f"   Tasa de éxito: {summary.get('success_rate', 0)}%")
                    
                    # Mostrar detalles de checks individuales
                    checks = data.get('checks', [])
                    for check in checks:
                        status_emoji = "✅" if check['status'] == 'healthy' else "⚠️" if check['status'] == 'warning' else "❌"
                        print(f"   {status_emoji} {check['name']}: {check['message']} ({check['response_time_ms']}ms)")
                    
                    # Mostrar recomendaciones si las hay
                    recommendations = data.get('recommendations', [])
                    if recommendations:
                        print("   🔧 Recomendaciones:")
                        for rec in recommendations:
                            print(f"      • {rec}")
                    
                    return data
                else:
                    print(f"❌ Health check forzado falló: HTTP {response.status}")
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            print(f"❌ Error en health check forzado: {e}")
            return {"error": str(e)}
    
    async def test_health_config(self) -> Dict[str, Any]:
        """Prueba el endpoint de configuración"""
        print("🔍 Probando configuración de health checks...")
        
        try:
            # Obtener configuración actual
            async with self.session.get(f"{self.base_url}/health/config") as response:
                if response.status == 200:
                    config = await response.json()
                    print("✅ Configuración obtenida exitosamente:")
                    print(f"   Habilitado: {config.get('enabled', False)}")
                    print(f"   Modo: {config.get('mode', 'unknown')}")
                    print(f"   Checks activos: {config.get('checks', {})}")
                    return config
                else:
                    print(f"❌ Error obteniendo configuración: HTTP {response.status}")
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            print(f"❌ Error en configuración: {e}")
            return {"error": str(e)}
    
    async def test_config_update(self) -> Dict[str, Any]:
        """Prueba la actualización de configuración"""
        print("🔍 Probando actualización de configuración...")
        
        try:
            # Actualizar configuración
            update_data = {
                "enabled": True,
                "mode": "startup",
                "check_database": True,
                "check_api_endpoints": True,
                "check_ai_services": True,
                "check_external_dependencies": False,
                "check_system_resources": True
            }
            
            async with self.session.post(
                f"{self.base_url}/health/config",
                json=update_data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ Configuración actualizada exitosamente")
                    print(f"   Mensaje: {result.get('message', '')}")
                    return result
                else:
                    print(f"❌ Error actualizando configuración: HTTP {response.status}")
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            print(f"❌ Error en actualización: {e}")
            return {"error": str(e)}
    
    async def run_all_tests(self):
        """Ejecuta todas las pruebas"""
        print("🚀 Iniciando pruebas del sistema de health checks...")
        print("=" * 60)
        
        results = {}
        
        # Prueba 1: Health check básico
        results['basic_health'] = await self.test_basic_health()
        print()
        
        # Prueba 2: Health check forzado
        results['forced_health'] = await self.test_forced_health_check()
        print()
        
        # Prueba 3: Configuración
        results['config'] = await self.test_health_config()
        print()
        
        # Prueba 4: Actualización de configuración
        results['config_update'] = await self.test_config_update()
        print()
        
        # Resumen
        print("=" * 60)
        print("📊 RESUMEN DE PRUEBAS:")
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            if 'error' not in result:
                print(f"✅ {test_name}: EXITOSO")
                passed += 1
            else:
                print(f"❌ {test_name}: FALLÓ - {result['error']}")
        
        print(f"\n🎯 Resultado: {passed}/{total} pruebas exitosas")
        
        if passed == total:
            print("🎉 ¡Todas las pruebas pasaron! El sistema de health checks está funcionando correctamente.")
        else:
            print("⚠️ Algunas pruebas fallaron. Revisa la configuración del backend.")
        
        return results

async def main():
    """Función principal"""
    print("🔧 Sistema de Health Checks - Script de Pruebas")
    print("Este script prueba el sistema de health checks del backend")
    print()
    
    # Verificar que el backend esté ejecutándose
    print("⚠️ Asegúrate de que el backend esté ejecutándose en http://localhost:8000")
    print("   Puedes iniciarlo con: uvicorn app.main:app --reload")
    print()
    
    input("Presiona Enter para continuar...")
    
    async with HealthCheckTester() as tester:
        await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
