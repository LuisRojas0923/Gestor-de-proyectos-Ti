import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.ia.chat_service import ChatTicketService
from app.models.herramientas_informaticas.maestro import HerramientaInformatica
from app.utils_cache import global_cache

@pytest.fixture(autouse=True)
def clear_cache():
    global_cache.clear()

@pytest.mark.asyncio
async def test_buscar_herramientas_relevantes():
    # Arrange
    service = ChatTicketService()
    db = AsyncMock()
    
    # Mock de resultados de la base de datos
    herramienta_mock = HerramientaInformatica(
        nombre="Excel de Viaticos",
        descripcion="Plantilla para reporte de viaticos",
        responsable="Juan Perez",
        fallas_comunes="Error en macro de calculo"
    )
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [herramienta_mock]
    db.execute.return_value = mock_result
    
    # Act
    mensaje = "Tengo un problema con el Excel de Viaticos"
    resultado = await service.buscar_herramientas_relevantes(mensaje, db)
    
    # Assert
    assert len(resultado) == 1
    assert resultado[0]["nombre"] == "Excel de Viaticos"
    assert resultado[0]["responsable"] == "Juan Perez"
    db.execute.assert_called_once()

@pytest.mark.asyncio
async def test_procesar_mensaje_con_contexto_inventario():
    # Arrange
    service = ChatTicketService()
    service.client = MagicMock()
    service.client.chat.completions.create = AsyncMock()
    
    db = AsyncMock()
    
    # Mock de categorías
    mock_cat_result = MagicMock()
    mock_cat_result.scalars.return_value.all.return_value = [
        MagicMock(id="soporte_software", nombre="Soporte Software", descripcion="Soporte a herramientas")
    ]
    
    # Mock de herramientas (segundo execute)
    mock_herr_result = MagicMock()
    mock_herr_result.scalars.return_value.all.return_value = [
        HerramientaInformatica(nombre="Excel de Viaticos", responsable="Juan Perez", fallas_comunes="N/A", descripcion="...")
    ]
    
    # Configurar db.execute para retornar diferentes resultados secuencialmente
    db.execute.side_effect = [mock_cat_result, mock_herr_result]
    
    service.client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="Hola, veo que tienes un problema con el Excel de Viaticos."))]
    )
    
    # Act
    await service.procesar_mensaje("Problema con Excel Viaticos", [], db)
    
    # Assert
    # Verificar que se llamó a buscar herramientas
    assert db.execute.call_count == 2
    
    # Verificar que el prompt enviado a OpenAI contiene el contexto de inventario
    args, kwargs = service.client.chat.completions.create.call_args
    system_prompt = kwargs['messages'][0]['content']
    # Verificar que el prompt enviado a OpenAI contiene el contexto de inventario refinado
    args, kwargs = service.client.chat.completions.create.call_args
    system_prompt = kwargs['messages'][0]['content']
    assert "INSTRUCCIÓN DE INVENTARIO" in system_prompt
    assert "Excel de Viaticos" in system_prompt
    assert "soporte_mejora" in system_prompt
    assert "Juan Perez" not in system_prompt # No se deben enviar datos internos en el prompt para evitar que la IA los mencione
