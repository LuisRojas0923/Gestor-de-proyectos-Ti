import asyncio
import time
import sys
import os

# Ajustar path para importar app desde backend_v2
# El script estará en /testing/ y la app está en /backend_v2/
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend_v2"))
)

try:
    from app.services.ia.chat_service import ChatTicketService
    from app.config import config
    from unittest.mock import AsyncMock, MagicMock
except ImportError as e:
    print(f"❌ Error al importar módulos: {e}")
    print(f"DEBUG: PYTHONPATH actual: {sys.path}")
    sys.exit(1)


async def test_performance():
    service = ChatTicketService()
    print("\nVALIDACION DE RENDIMIENTO - IA CHAT")
    print(f"=========================================")
    print(f"Proveedor: {config.ia_provider}")
    print(f"Modelo:    {service.model}")
    print(f"Endpoint:  {config.ia_base_url}")

    # 1. Validar Cache de Categorías
    db = AsyncMock()
    mock_result = MagicMock()
    # Simular una categoría como objeto (con atributos, no diccionario)
    mock_cat = MagicMock()
    mock_cat.id = "soporte_tecnico"
    mock_cat.nombre = "Soporte Técnico"
    mock_cat.descripcion = "Prueba"
    mock_result.scalars.return_value.all.return_value = [mock_cat]
    db.execute.return_value = mock_result

    print("\n[1/3] Verificando Cache de Base de Datos...")
    start_cache = time.perf_counter()
    await service.obtener_categorias(db)  # Primera vez
    mid_cache = time.perf_counter()
    await service.obtener_categorias(db)  # Segunda vez (Cache)
    end_cache = time.perf_counter()

    t1 = (mid_cache - start_cache) * 1000
    t2 = (end_cache - mid_cache) * 1000

    print(f"  - Tiempo 1ª llamada (Simulada): {t1:.2f}ms")
    print(f"  - Tiempo 2ª llamada (Cache):   {t2:.2f}ms")
    if t2 < t1:
        print("  - Estado: CACHE OPERATIVA OK")
    else:
        print("  - Estado: CACHE NO DETECTADA WARN")

    # 2. Validar Streaming y Latencia Real
    if not config.ia_api_key or config.ia_api_key == "tu-api-key":
        print("\n[2/3] Midiendo Latencia Real de IA...")
        print("  WARN Omitido: No hay API Key valida configurada.")
    else:
        print("\n[2/3] Midiendo Latencia Real de IA (Streaming)...")
        print("  (Enviando mensaje: 'Hola, necesito ayuda con mi laptop')")
        start_ia = time.perf_counter()
        first_token_time = None
        chars_count = 0

        try:
            async for chunk in service.procesar_mensaje_stream(
                "Hola, necesito ayuda con mi laptop", [], db
            ):
                if first_token_time is None:
                    first_token_time = time.perf_counter()
                    print(
                        f"  - Latencia primer token (TTFT): {(first_token_time - start_ia):.2f}s"
                    )
                chars_count += len(chunk)

            end_ia = time.perf_counter()
            total_time = end_ia - start_ia
            print(f"  - Tiempo total de respuesta:   {total_time:.2f}s")
            print(f"  - Caracteres generados:        {chars_count}")

            if total_time < 2:
                print("  - Estado: RENDIMIENTO OPTIMO OK")
            else:
                print("  - Estado: LATENCIA ELEVADA WARN")
        except Exception as e:
            print(f"  ERR Error en llamada a IA: {str(e)}")

    # 3. Validar Extraccion de Datos
    print("\n[3/3] Validando Logica de Extraccion...")
    sample_text = 'Claro. {"ticket_data": {"asunto": "Fallo en PC", "prioridad": "Alta", "categoria_id": "hard"}}'
    data = service.extraer_ticket_data(sample_text)
    if data and data.get("asunto") == "Fallo en PC":
        print(f"  - Extraccion exitosa: {data} OK")
    else:
        print("  - Fallo en extraccion ERR")

    print("\n=========================================")
    print("PRUEBA FINALIZADA\n")


if __name__ == "__main__":
    asyncio.run(test_performance())
