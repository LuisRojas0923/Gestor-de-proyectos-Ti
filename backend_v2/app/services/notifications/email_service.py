
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from app.config import config

class EmailService:
    """Servicio para el envío de correos electrónicos vía SMTP"""

    @staticmethod
    def enviar_correo(
        asunto: str,
        destinatarios: List[str],
        contenido_html: str,
        contenido_texto: Optional[str] = None
    ) -> bool:
        """
        Envía un correo electrónico utilizando la configuración SMTP del sistema.
        """
        if not config.smtp_host or not config.smtp_user or not config.smtp_pass:
            print("WARNING: Configuración SMTP incompleta. El correo no será enviado.")
            return False

        try:
            # Crear el mensaje
            mensaje = MIMEMultipart("alternative")
            mensaje["Subject"] = asunto
            mensaje["From"] = config.smtp_from or config.smtp_user
            mensaje["To"] = ", ".join(destinatarios)

            # Agregar contenido de texto plano (opcional)
            if contenido_texto:
                mensaje.attach(MIMEText(contenido_texto, "plain"))
            
            # Agregar contenido HTML
            mensaje.attach(MIMEText(contenido_html, "html"))

            # Configurar conexión
            if config.smtp_use_ssl:
                server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port)
            else:
                server = smtplib.SMTP(config.smtp_host, config.smtp_port)
                server.starttls()

            # Autenticación y envío
            server.login(config.smtp_user, config.smtp_pass)
            server.send_message(mensaje)
            server.quit()

            print(f"DEBUG: Correo enviado exitosamente a {destinatarios}")
            return True

        except Exception as e:
            print(f"ERROR al enviar correo: {e}")
            return False

    @staticmethod
    def enviar_notificacion_actualizacion(email: str, nombre: str):
        """Envía un correo de confirmación tras la actualización exitosa"""
        asunto = "Confirmación de Actualización de Correo Corporativo"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #2c3e50; text-align: center;">¡Gracias por actualizar tus datos!</h2>
            <p>Hola <strong>{nombre}</strong>,</p>
            <p>Este correo confirma que has actualizado exitosamente tu dirección de correo corporativo en nuestro sistema.</p>
            <p style="background: #f4f4f4; padding: 10px; border-radius: 5px; text-align: center;">
                <strong>{email}</strong>
            </p>
            <p>A partir de ahora, recibirás todas las notificaciones importantes del Gestor de Proyectos TI en esta dirección.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.8em; color: #7f8c8d; text-align: center;">
                Este es un mensaje automático, por favor no respondas a este correo.
            </p>
        </div>
        """
        return EmailService.enviar_correo(asunto, [email], html)
