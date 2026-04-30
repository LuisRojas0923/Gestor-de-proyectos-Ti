import asyncio
import sys
import os

# Añadir el path del backend para poder importar los módulos
sys.path.append(os.path.join(os.getcwd(), "backend_v2"))

from app.services.ia.chat_service import ChatTicketService

async def test_categorization():
    service = ChatTicketService()
    
    # Casos de prueba: Validamos Nombre (UI) e ID (DB)
    casos = [
        {
            "nombre": "CASO SOFTWARE (SIIGO)",
            "mensaje": "Siigo me saca un error de sesión al intentar facturar",
            "id_esperado": "soporte_software",
            "nombre_esperado": "Soporte de Software"
        },
        {
            "nombre": "CASO PERIFERICOS (MOUSE)",
            "mensaje": "Necesito un mouse nuevo porque el mio ya no funciona",
            "id_esperado": "perifericos",
            "nombre_esperado": "Periféricos y Equipos"
        },
        {
            "nombre": "CASO DIAN Y CORREOS",
            "mensaje": "No le están llegando los correos de la DIAN para el token a la jefa Gladys",
            "id_esperado": "soporte_software",
            "nombre_esperado": "Soporte de Software"
        }
    ]

    print("\n[TEST] VALIDANDO NOMBRES AMIGABLES (UI) E IDS (DB)")
    print("================================================")

    for caso in casos:
        print(f"\nTesting: {caso['nombre']}")
        
        try:
            # Mocks
            async def mock_get_cats(db):
                return [
                    {"id": "soporte_software", "nombre": "Soporte de Software"},
                    {"id": "perifericos", "nombre": "Periféricos y Equipos"}
                ]
            service.obtener_categorias = mock_get_cats
            async def mock_get_inv(db): return []
            service._obtener_inventario_completo = mock_get_inv
            
            # 1. TEST FASE PROPUESTA (Debe mostrar el Nombre)
            res_propuesta = await service.procesar_mensaje(caso['mensaje'], [], None)
            print(f"  - Validando UI (Nombre): '{caso['nombre_esperado']}'")
            if caso['nombre_esperado'] in res_propuesta['respuesta']:
                print("    [OK] El usuario ve el nombre correcto.")
            else:
                print(f"    [FAIL] El usuario NO ve el nombre. Respuesta: {res_propuesta['respuesta'][:100]}...")

            # 2. TEST FASE CREACION (Debe usar el ID en el JSON)
            # Simulamos confirmación del usuario
            historial = [
                {"role": "user", "content": caso['mensaje']},
                {"role": "assistant", "content": res_propuesta['respuesta']}
            ]
            res_creacion = await service.procesar_mensaje("¡Sí, crear ticket!", historial, None)
            
            ticket_data = res_creacion.get('ticket_data')
            if ticket_data:
                id_detectado = ticket_data.get('categoria_id')
                print(f"  - Validando DB (ID): '{id_detectado}'")
                if id_detectado == caso['id_esperado']:
                    print("    [OK] El sistema guarda el ID correcto.")
                else:
                    print(f"    [FAIL] Se guardó ID incorrecto: '{id_detectado}'")
            else:
                print("    [FAIL] No se generó JSON de ticket.")
                
        except Exception as e:
            print(f"  [ERROR] Error: {str(e)}")

    print("\n" + "=" * 48)
    print("TEST FINALIZADO")

if __name__ == "__main__":
    asyncio.run(test_categorization())
