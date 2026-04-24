
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import BackgroundTasks
from app.services.ticket.servicio import ServicioTicket
from app.models.ticket.ticket import TicketCrear, TicketActualizar, ComentarioCrear

@pytest.mark.asyncio
async def test_crear_ticket_uses_background_tasks():
    # Setup
    db = AsyncMock()
    bg_tasks = MagicMock(spec=BackgroundTasks)
    ticket_data = TicketCrear(
        categoria_id="soporte_it",
        asunto="Test background",
        descripcion="Test desc",
        creador_id="user123",
        nombre_creador="Test User",
        correo_creador="test@refridcol.com.co",
        area_creador="IT",
        sede_creador="Bogota"
    )

    # Mock Result
    mock_result = MagicMock()
    mock_result.scalar.return_value = 1
    
    mock_user = MagicMock()
    mock_user.correo_verificado = True
    mock_result.scalars.return_value.first.return_value = mock_user
    
    db.execute.return_value = mock_result

    # Mocks para evitar lógica interna compleja
    with patch("app.services.ticket.servicio.ServicioTicket.obtener_analista_menos_cargado", return_value="analista1"), \
         patch("app.services.ticket.servicio.ServicioTicket.registrar_historial", return_value=AsyncMock()), \
         patch("app.services.ticket.servicio.ServicioTicket.obtener_ticket_por_id", new_callable=AsyncMock) as mock_obtener:
        
        mock_obtener.return_value = MagicMock()

        # Ejecutar
        await ServicioTicket.crear_ticket(db, ticket_data, background_tasks=bg_tasks)

        # Verificar que se añadió la tarea al background
        bg_tasks.add_task.assert_called()
        
        found = False
        for call in bg_tasks.add_task.call_args_list:
            if "enviar_confirmacion_ticket" in str(call):
                found = True
        assert found

@pytest.mark.asyncio
async def test_actualizar_ticket_uses_background_tasks():
    db = AsyncMock()
    bg_tasks = MagicMock(spec=BackgroundTasks)
    ticket_id = "TKT-0001"
    update_data = TicketActualizar(estado="Resuelto", resolucion="Fixed")

    # Mock del ticket en DB
    db_ticket = MagicMock()
    db_ticket.id = ticket_id
    db_ticket.estado = "Abierto"
    db_ticket.correo_creador = "test@refridcol.com.co"
    db_ticket.asunto = "Asunto"
    db_ticket.nombre_creador = "User"
    db_ticket.resolucion = None
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = db_ticket
    db.execute.return_value = mock_result

    with patch("app.services.ticket.servicio.ServicioTicket.registrar_historial", return_value=AsyncMock()), \
         patch("app.services.notifications.email_service.EmailService.enviar_notificacion_cambio_estado", new_callable=AsyncMock):
        
        await ServicioTicket.actualizar_ticket(db, ticket_id, update_data, background_tasks=bg_tasks)

        found = False
        for call in bg_tasks.add_task.call_args_list:
            if "enviar_notificacion_cambio_estado" in str(call):
                found = True
        assert found

@pytest.mark.asyncio
async def test_agregar_comentario_uses_background_tasks():
    db = AsyncMock()
    bg_tasks = MagicMock(spec=BackgroundTasks)
    ticket_id = "TKT-0001"
    com_data = ComentarioCrear(
        usuario_id="user1",
        nombre_usuario="Analista",
        comentario="Hola mundo",
        es_interno=False
    )

    # Mock ticket
    ticket = MagicMock()
    ticket.id = ticket_id
    ticket.correo_creador = "creator@test.com"
    ticket.nombre_creador = "Creator"
    ticket.asunto = "Problem"
    
    # Mock para obtener_ticket_por_id
    with patch("app.services.ticket.servicio.ServicioTicket.obtener_ticket_por_id", new_callable=AsyncMock) as mock_obtener:
        mock_obtener.return_value = ticket
        
        with patch("app.services.ticket.servicio.global_cache.get", return_value=None), \
             patch("app.services.ticket.servicio.global_cache.set"), \
             patch("app.services.notifications.email_service.EmailService.enviar_notificacion_chat", new_callable=AsyncMock):
            
            await ServicioTicket.agregar_comentario(db, ticket_id, com_data, background_tasks=bg_tasks)

            found = False
            for call in bg_tasks.add_task.call_args_list:
                if "enviar_notificacion_chat" in str(call):
                    found = True
            assert found
