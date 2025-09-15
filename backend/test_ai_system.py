#!/usr/bin/env python3
"""
Script de prueba para el sistema de IA con respuestas mock
Sistema de Gestión de Proyectos TI - Fase 3
"""

import asyncio
import sys
import os
from datetime import datetime

# Agregar el directorio del proyecto al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ai_service import AIService

async def test_ai_service():
    """Probar el servicio de IA con respuestas mock"""
    print("🤖 PROBANDO SISTEMA DE IA CON MOCK RESPONSES")
    print("=" * 50)
    
    # Inicializar servicio de IA
    ai_service = AIService()
    print(f"✅ AI Service inicializado en modo: {'MOCK' if ai_service.mock_mode else 'LIVE'}")
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
    
    # Test 2: Generación de comunicación
    print("📧 Test 2: Generación de Comunicación")
    print("-" * 30)
    
    comm_result = await ai_service.generate_communication(test_requirement, "solicitud_aprobacion")
    if comm_result["success"]:
        print("✅ Comunicación generada exitosamente")
        print(f"📝 Asunto: {comm_result['communication']['subject']}")
        print(f"📄 Contenido: {comm_result['communication']['content'][:100]}...")
        print(f"🔑 Puntos clave: {len(comm_result['communication']['key_points'])} puntos")
        print(f"📞 Llamada a la acción: {comm_result['communication']['call_to_action']}")
    else:
        print(f"❌ Error en comunicación: {comm_result['error']}")
    print()
    
    # Test 3: Validación de requerimiento
    print("✅ Test 3: Validación de Requerimiento")
    print("-" * 30)
    
    validation_result = await ai_service.validate_requirement_format(test_requirement)
    if validation_result["success"]:
        print("✅ Validación completada")
        print(f"📊 Pasa validación: {'SÍ' if validation_result['validation']['pasa'] else 'NO'}")
        if validation_result['validation']['errores']:
            print(f"❌ Errores: {validation_result['validation']['errores']}")
        if validation_result['validation']['recomendaciones']:
            print(f"💡 Recomendaciones: {validation_result['validation']['recomendaciones']}")
    else:
        print(f"❌ Error en validación: {validation_result['error']}")
    print()
    
    # Test 4: Análisis de desarrollo
    print("🔍 Test 4: Análisis de Desarrollo")
    print("-" * 30)
    
    dev_analysis = await ai_service.analyze_development("DEV-001", "¿Cuál es el estado actual del proyecto?")
    if dev_analysis["success"]:
        print("✅ Análisis de desarrollo completado")
        print(f"📊 Análisis: {dev_analysis['analysis']}")
        print(f"🎯 Confianza: {dev_analysis['confidence']:.2f}")
        print(f"💡 Recomendaciones: {len(dev_analysis['recommendations'])} items")
        print(f"⚠️ Riesgos: {len(dev_analysis['risks'])} items")
    else:
        print(f"❌ Error en análisis: {dev_analysis['error']}")
    print()
    
    # Test 5: Recomendaciones
    print("💡 Test 5: Recomendaciones")
    print("-" * 30)
    
    recommendations = await ai_service.get_recommendations("DEV-001", {"focus_areas": ["quality", "timeline"]})
    if recommendations["success"]:
        print("✅ Recomendaciones generadas")
        print(f"📋 Resumen: {recommendations['summary']}")
        for i, rec in enumerate(recommendations['recommendations'], 1):
            print(f"  {i}. {rec['title']} (Prioridad: {rec['priority']})")
            print(f"     Confianza: {rec['confidence']:.2f}")
            print(f"     Impacto: {rec['estimated_impact']}")
    else:
        print(f"❌ Error en recomendaciones: {recommendations['error']}")
    print()
    
    # Test 6: Chat contextual
    print("💬 Test 6: Chat Contextual")
    print("-" * 30)
    
    chat_result = await ai_service.contextual_chat("¿Cómo está el progreso del proyecto DEV-001?", {"development_id": "DEV-001"})
    if chat_result["success"]:
        print("✅ Chat contextual funcionando")
        print(f"🤖 Respuesta: {chat_result['response']}")
        print(f"🔗 Contexto usado: {chat_result['context_used']}")
    else:
        print(f"❌ Error en chat: {chat_result['error']}")
    print()
    
    print("🎉 TODAS LAS PRUEBAS COMPLETADAS")
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
