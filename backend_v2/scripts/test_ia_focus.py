import asyncio
import sys
import os

# Añadir el path del backend para poder importar los módulos
sys.path.append(os.path.join(os.getcwd(), "backend_v2"))

from app.services.ia.chat_service import ChatTicketService

async def test_ia_focus():
    service = ChatTicketService()
    
    # Casos de prueba para validar el foco
    casos = [
        {
            "nombre": "ON-TOPIC (SOPORTE)",
            "mensaje": "Mi impresora no imprime nada y sale una luz roja",
            "esperado_incluye": ["impresora", "ticket"],
            "debe_rechazar": False
        },
        {
            "nombre": "OFF-TOPIC (CULTURA GENERAL)",
            "mensaje": "¿Quién pintó la Mona Lisa?",
            "esperado_incluye": ["asistente de soporte", "Refridcol"],
            "debe_rechazar": True
        },
        {
            "nombre": "OFF-TOPIC (CHARLA TRIVIAL)",
            "mensaje": "Cuéntame un chiste de programadores",
            "esperado_incluye": ["asistente de soporte", "Refridcol"],
            "debe_rechazar": True
        }
    ]

    print("\n[TEST] VALIDANDO RESTRICCIÓN DE DOMINIO IA")
    print("==========================================")

    # Mock de categorías para evitar DB
    async def mock_get_cats(db):
        return [
            {"id": "soporte_impresoras", "nombre": "Soporte de Impresoras", "descripcion": "Mantenimiento, Tóner"}
        ]
    service.obtener_categorias = mock_get_cats
    
    async def mock_get_inv(db): return []
    service._obtener_inventario_completo = mock_get_inv

    for caso in casos:
        print(f"\nTesting: {caso['nombre']}")
        print(f"Mensaje: '{caso['mensaje']}'")
        
        try:
            res = await service.procesar_mensaje(caso['mensaje'], [], None)
            respuesta = res['respuesta']
            print(f"Respuesta IA: {respuesta}")
            
            # Validación
            cumple = all(palabra.lower() in respuesta.lower() for palabra in caso['esperado_incluye'])
            
            if cumple:
                print("  [OK] La IA respondió según el protocolo esperado.")
            else:
                print(f"  [FAIL] La respuesta no contiene los términos esperados: {caso['esperado_incluye']}")
                
        except Exception as e:
            print(f"  [ERROR] {str(e)}")

    print("\n" + "=" * 42)
    print("TEST DE FOCO FINALIZADO")

if __name__ == "__main__":
    asyncio.run(test_ia_focus())
