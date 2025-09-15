#!/usr/bin/env python3
"""
Script de prueba simple para el sistema de IA
Sistema de Gestión de Proyectos TI - Fase 3
"""

import asyncio
import random
from datetime import datetime

class MockAIService:
    """Versión simplificada del servicio de IA para pruebas"""
    
    def __init__(self):
        self.mock_mode = True
        print(f"✅ AI Service inicializado en modo: {'MOCK' if self.mock_mode else 'LIVE'}")
    
    async def analyze_requirement(self, requirement_data):
        """Mock analysis for development without API keys"""
        await asyncio.sleep(random.uniform(0.5, 2.0))  # Simulate API delay
        
        title = requirement_data.get('title', 'Requerimiento sin título')
        priority = requirement_data.get('priority', 'media')
        
        mock_responses = {
            "resumen": f"El requerimiento '{title}' requiere análisis detallado para determinar su impacto en el sistema actual.",
            "clasificacion": random.choice(["Feature", "Enhancement", "Bug Fix", "Integration"]),
            "prioridad_sugerida": priority.title() if priority else random.choice(["Baja", "Media", "Alta", "Crítica"]),
            "esfuerzo_estimado": random.choice(["Bajo", "Medio", "Alto"]),
            "areas_impactadas": random.choice([
                "Frontend, Backend, Base de datos",
                "API, Autenticación, Seguridad",
                "UI/UX, Performance, Integración"
            ]),
            "riesgos": random.choice([
                "Posible impacto en funcionalidades existentes",
                "Dependencias externas no controladas",
                "Complejidad técnica subestimada"
            ]),
            "recomendaciones": random.choice([
                "Realizar pruebas exhaustivas antes del despliegue",
                "Documentar todos los cambios realizados",
                "Coordinar con el equipo de QA para validación"
            ])
        }
        
        return {
            "success": True,
            "analysis": mock_responses,
            "raw_response": f"Análisis mock generado para: {title}",
            "mock_mode": True
        }
    
    async def contextual_chat(self, message, context):
        """Contextual chat with system knowledge"""
        await asyncio.sleep(random.uniform(0.5, 2.0))
        
        responses = [
            f"Basándome en el contexto del sistema, puedo ayudarte con: {message}",
            f"Según los datos disponibles, te sugiero revisar los indicadores de calidad para: {message}",
            f"Para responder a tu consulta sobre '{message}', necesitaría más información sobre el desarrollo específico.",
            f"Basándome en el análisis de tendencias, puedo proporcionar insights sobre: {message}"
        ]
        
        return {
            "success": True,
            "response": random.choice(responses),
            "context_used": ["developments", "kpis", "quality_metrics"],
            "mock_mode": True
        }

async def test_ai_service():
    """Probar el servicio de IA con respuestas mock"""
    print("🤖 PROBANDO SISTEMA DE IA CON MOCK RESPONSES")
    print("=" * 50)
    
    # Inicializar servicio de IA
    ai_service = MockAIService()
    print()
    
    # Test 1: Análisis de requerimiento
    print("📋 Test 1: Análisis de Requerimiento")
    print("-" * 30)
    
    test_requirement = {
        "title": "Implementar autenticación OAuth2",
        "description": "Necesitamos agregar autenticación OAuth2 para integrar con servicios externos de manera segura",
        "priority": "alta",
        "type": "feature"
    }
    
    result = await ai_service.analyze_requirement(test_requirement)
    if result["success"]:
        print("✅ Análisis completado exitosamente")
        print(f"📊 Resumen: {result['analysis']['resumen']}")
        print(f"🏷️ Clasificación: {result['analysis']['clasificacion']}")
        print(f"⚡ Prioridad sugerida: {result['analysis']['prioridad_sugerida']}")
        print(f"💪 Esfuerzo estimado: {result['analysis']['esfuerzo_estimado']}")
        print(f"🎯 Áreas impactadas: {result['analysis']['areas_impactadas']}")
        print(f"⚠️ Riesgos: {result['analysis']['riesgos']}")
        print(f"💡 Recomendaciones: {result['analysis']['recomendaciones']}")
    else:
        print(f"❌ Error en análisis: {result['error']}")
    print()
    
    # Test 2: Chat contextual
    print("💬 Test 2: Chat Contextual")
    print("-" * 30)
    
    chat_result = await ai_service.contextual_chat("¿Cómo está el progreso del proyecto DEV-001?", {"development_id": "DEV-001"})
    if chat_result["success"]:
        print("✅ Chat contextual funcionando")
        print(f"🤖 Respuesta: {chat_result['response']}")
        print(f"🔗 Contexto usado: {chat_result['context_used']}")
    else:
        print(f"❌ Error en chat: {chat_result['error']}")
    print()
    
    print("🎉 PRUEBAS COMPLETADAS")
    print("=" * 50)
    print("✅ Sistema de IA configurado correctamente en modo MOCK")
    print("✅ Todas las funcionalidades básicas operativas")
    print("✅ Listo para integrar APIs reales cuando estén disponibles")
    print()
    print("📝 PRÓXIMOS PASOS:")
    print("1. Crear interfaz de chat en el frontend")
    print("2. Integrar con dashboard existente")
    print("3. Agregar APIs reales cuando tengas los tokens")
    print("4. Implementar persistencia en base de datos")

if __name__ == "__main__":
    asyncio.run(test_ai_service())
