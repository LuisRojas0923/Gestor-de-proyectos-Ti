
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.notifications.email_service import EmailService

@pytest.fixture
def email_service():
    return EmailService()

def test_ticket_message_id_generation(email_service):
    """Verifica que el Message-ID sea determinista para un ticket."""
    ticket_id = "TKT-1234"
    msg_id = email_service._get_ticket_message_id(ticket_id)
    
    assert msg_id == f"<ticket-TKT-1234@portal.refridcol.com.co>"
    # Verificar consistencia
    assert msg_id == email_service._get_ticket_message_id(ticket_id)

@pytest.mark.asyncio
@patch("smtplib.SMTP_SSL")
@patch("smtplib.SMTP")
async def test_enviar_correo_headers(mock_smtp, mock_smtp_ssl, email_service):
    """Verifica que enviar_correo inyecte las cabeceras de threading."""
    # Configurar mock para que no falle al crear la instancia
    mock_smtp.return_value = MagicMock()
    mock_smtp_ssl.return_value = MagicMock()
    
    # Decidir cuál interceptar basándonos en la configuración de la prueba
    from app.config import config
    instance = mock_smtp_ssl.return_value if config.smtp_use_ssl else mock_smtp.return_value
    
    destinatarios = ["test@example.com"]
    asunto = "Asunto de Prueba"
    contenido_html = "<p>Hola</p>"
    message_id = "<msg-1@test.com>"
    in_reply_to = "<msg-0@test.com>"
    
    await email_service.enviar_correo(
        asunto=asunto,
        destinatarios=destinatarios,
        contenido_html=contenido_html,
        message_id=message_id,
        in_reply_to=in_reply_to
    )
    
    # Obtener el mensaje enviado
    args, kwargs = instance.send_message.call_args
    msg = args[0]
    
    assert msg["Message-ID"] == message_id
    assert msg["In-Reply-To"] == in_reply_to
    assert msg["References"] == in_reply_to
    assert msg["Subject"] == asunto

@pytest.mark.asyncio
@patch("app.services.notifications.email_service.EmailService.enviar_correo", new_callable=AsyncMock)
async def test_enviar_notificacion_cambio_estado(mock_enviar, email_service):
    """Verifica que la notificación de estado use el formato de asunto correcto y headers."""
    
    # Mockear _render_template para evitar errores de archivos de plantilla inexistentes
    with patch.object(EmailService, "_render_template", return_value="<html>Contenido</html>"):
        await email_service.enviar_notificacion_cambio_estado(
            email_destinatario="usuario@test.com",
            nombre_destinatario="Juan",
            ticket_id="TKT-9999",
            asunto_ticket="Falla en Servidor",
            nuevo_estado="Resuelto",
            comentario="Solucionado"
        )
    
    # Verificar la llamada a enviar_correo
    assert mock_enviar.called
    args = mock_enviar.call_args.args
    kwargs = mock_enviar.call_args.kwargs
    
    # El asunto es el primer argumento posicional en enviar_notificacion_cambio_estado -> enviar_correo
    asunto_enviado = args[0]
    assert asunto_enviado == "Re: [Ticket #TKT-9999] Falla en Servidor"
    
    # Verificar headers de threading (pasados por keyword)
    expected_msg_id = email_service._get_ticket_message_id("TKT-9999")
    assert kwargs["in_reply_to"] == expected_msg_id

def test_subject_standardization(email_service):
    """Verifica la lógica de estandarización de asuntos."""
    ticket_id = "TKT-555"
    asunto_sucio = "  Ayuda con mi PC  "
    
    asunto_final = email_service._standardize_ticket_subject(ticket_id, asunto_sucio)
    assert asunto_final == "[Ticket #TKT-555] Ayuda con mi PC"
    
    # Test de respuesta
    asunto_resp = email_service._standardize_ticket_subject(ticket_id, asunto_sucio, es_respuesta=True)
    assert asunto_resp == "Re: [Ticket #TKT-555] Ayuda con mi PC"
    
    # Evitar duplicidad si ya tiene el tag
    asunto_repetido = "[Ticket #TKT-555] Algo paso"
    asunto_fix = email_service._standardize_ticket_subject(ticket_id, asunto_repetido)
    assert asunto_fix == "[Ticket #TKT-555] Algo paso"
