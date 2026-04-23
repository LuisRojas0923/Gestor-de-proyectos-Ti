import os
from typing import List, Optional, Union
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from jinja2 import Environment, FileSystemLoader
from app.config import config
from .email_utils import EmailUtils


class EmailService:
    """Servicio para el envío de correos electrónicos vía SMTP"""

    # Configuración de Jinja2
    TEMPLATES_DIR = os.path.join(
        os.path.dirname(__file__), "..", "..", "resources", "templates"
    )
    _jinja_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

    _render_template = EmailUtils._render_template if hasattr(EmailUtils, "_render_template") else None
    get_frontend_url = EmailUtils.get_frontend_url
    _standardize_ticket_subject = EmailUtils._standardize_ticket_subject
    _get_ticket_message_id = EmailUtils._get_ticket_message_id
    _get_attachments = EmailUtils._get_attachments

    @staticmethod
    async def enviar_correo(
        asunto: str,
        destinatarios: List[str],
        contenido_html: str,
        contenido_texto: Optional[str] = None,
        attachments: Optional[List[dict]] = None,
        message_id: Optional[str] = None,
        in_reply_to: Optional[str] = None
    ) -> bool:
        """
        Envía un correo electrónico utilizando la configuración SMTP del sistema.
        Soporta cabeceras de threading (Message-ID, In-Reply-To).
        """
        if not config.smtp_host or not config.smtp_user or not config.smtp_pass:
            print("WARNING: Configuración SMTP incompleta. El correo no será enviado.")
            return False

        try:
            # Estructura para imágenes inline (CID):
            # related
            #   |-- alternative
            #   |     |-- plain text
            #   |     |-- html
            #   |-- inline images
            
            msg_root = MIMEMultipart("related")
            msg_root["Subject"] = asunto
            msg_root["From"] = config.smtp_from or config.smtp_user
            msg_root["To"] = ", ".join(destinatarios)

            # Cabeceras para Hilos (Threading)
            if message_id:
                msg_root["Message-ID"] = message_id
            if in_reply_to:
                msg_root["In-Reply-To"] = in_reply_to
                # References suele contener el historial de IDs, pero el raíz es el más importante
                msg_root["References"] = in_reply_to

            msg_alternative = MIMEMultipart("alternative")
            msg_root.attach(msg_alternative)

            # Agregar contenido de texto plano (opcional)
            if contenido_texto:
                msg_alternative.attach(MIMEText(contenido_texto, "plain"))

            # Agregar contenido HTML
            msg_alternative.attach(MIMEText(contenido_html, "html"))

            # Agregar adjuntos (como imágenes CID)
            if attachments:
                for attachment in attachments:
                    if attachment.get("type") == "image":
                        try:
                            if not os.path.exists(attachment["path"]):
                                print(f"ERROR: No existe el archivo de imagen en: {attachment['path']}")
                                continue
                                
                            with open(attachment["path"], 'rb') as f:
                                img = MIMEImage(f.read())
                                # El CID debe ir entre brackets <>
                                cid = attachment["cid"]
                                img.add_header('Content-ID', f'<{cid}>')
                                img.add_header('Content-Disposition', 'inline', filename=os.path.basename(attachment["path"]))
                                msg_root.attach(img)
                        except Exception as img_err:
                            print(f"WARNING: No se pudo adjuntar imagen {attachment['path']}: {img_err}")

            # Configurar conexión
            if config.smtp_use_ssl:
                server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port)
            else:
                server = smtplib.SMTP(config.smtp_host, config.smtp_port)
                server.starttls()

            # Autenticación y envío
            server.login(config.smtp_user, config.smtp_pass)
            server.send_message(msg_root)
            server.quit()

            final_url = EmailService.get_frontend_url()
            print(f"DEBUG: Correo enviado a {destinatarios}. URL Links: {final_url}")
            return True

        except Exception as e:
            print(f"ERROR al enviar correo: {e}")
            return False

    @staticmethod
    def _get_base_layout(titulo: str, contenido_html: str) -> str:
        return EmailUtils._get_base_layout(titulo, contenido_html)

    # Ruta al logo corporativo (usado en CIDs) - Dinámica para facilitar Docker
    LOGO_PATH = os.path.join(
        os.path.dirname(__file__), "..", "..", "resources", "images", "logo_refridcol.png"
    )

    @staticmethod
    def _get_attachments() -> List[dict]:
        """Retorna la lista de adjuntos base (ej. logo)"""
        if os.path.exists(EmailService.LOGO_PATH):
            return [{
                "path": EmailService.LOGO_PATH,
                "cid": "logo_refridcol",
                "type": "image"
            }]
        return []

    @staticmethod
    async def enviar_notificacion_actualizacion(email: str, nombre: str):
        """Notifica al usuario que debe actualizar su correo (Uso administrativo)"""
        asunto = "Actualización de Correo Corporativo - Portal de Servicios"
        titulo = "Actualización Necesaria"
        
        cuerpo_html = f"""
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hola <strong>{nombre}</strong>,
        </p>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Hemos detectado que tu cuenta aún no cuenta con un correo corporativo validado en nuestro nuevo portal. 
            Para asegurar que recibas todas las notificaciones de tus tickets, por favor actualiza tu información.
        </p>
        <div style="text-align: center; margin-bottom: 30px;">
            <a href="{EmailService.get_frontend_url()}/service-portal" style="background-color: #002060; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
                Actualizar mi Correo Ahora
            </a>
        </div>
        """
        
        html_final = EmailService._get_base_layout(titulo, cuerpo_html)
        return await EmailService.enviar_correo(
            asunto, 
            [email], 
            html_final, 
            attachments=EmailService._get_attachments()
        )

    @staticmethod
    async def enviar_confirmacion_registro(email: str, nombre: str, token_url: str) -> bool:
        """Envía un correo de verificación de cuenta profesional usando plantillas premium"""
        asunto = "Verifica tu correo - Portal de Servicios Solid"
        
        try:
            html_final = EmailService._render_template(
                "emails/verify_email.html",
                titulo="Confirmación de Correo",
                nombre=nombre,
                verify_url=token_url
            )
            
            return await EmailService.enviar_correo(
                asunto, 
                [email], 
                html_final, 
                attachments=EmailService._get_attachments()
            )
        except Exception as e:
            print(f"ERROR al renderizar/enviar correo de verificación: {e}")
            return False

    @staticmethod
    async def enviar_exito_verificacion(email: str, nombre: str) -> bool:
        """Envía un correo de éxito tras verificar la cuenta"""
        asunto = "¡Tu correo ha sido verificado! - Portal de Servicios Solid"
        
        try:
            html_final = EmailService._render_template(
                "emails/verification_success.html",
                titulo="Correo Verificado",
                nombre=nombre,
                login_url=f"{EmailService.get_frontend_url()}/login"
            )
            
            return await EmailService.enviar_correo(
                asunto, 
                [email], 
                html_final, 
                attachments=EmailService._get_attachments()
            )
        except Exception as e:
            print(f"ERROR al renderizar/enviar correo de éxito: {e}")
            return False


    @staticmethod
    async def enviar_confirmacion_ticket(
        email: Union[str, List[str]],
        nombre: str,
        ticket_id: str,
        asunto_ticket: str,
        descripcion: str,
        categoria: str,
    ) -> bool:
        """Envía un correo de acuse de recibo premium con los colores del portal (Navy Blue)"""
        # Formato de asunto estandarizado para hilos
        asunto = EmailService._standardize_ticket_subject(ticket_id, asunto_ticket)
        titulo = "¡Solicitud Recibida!"
        
        # Asegurar que email sea una lista para el envío
        destinatarios = [email] if isinstance(email, str) else email

        # Limitar descripción para el resumen
        desc_resumen = (descripcion[:250] + "...") if len(descripcion) > 250 else descripcion

        cuerpo_especifico = f"""
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hola <strong>{nombre}</strong>,<br><br>
            Hemos recibido correctamente tu solicitud en el Portal de Servicios. Puedes hacer seguimiento del estado de tu requerimiento haciendo clic en el botón de abajo o ingresando directamente al portal.
        </p>
        
        <!-- Detalle del Ticket con colores Navy -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
            <tr>
                <td style="padding: 25px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td style="padding-bottom: 15px;">
                                <span style="color: #718096; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">ID del Ticket</span>
                                <span style="color: #002060; font-size: 20px; font-weight: 700;">{ticket_id}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-bottom: 15px; border-top: 1px solid #edf2f7; padding-top: 15px;">
                                <span style="color: #718096; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">Categoría / Asunto</span>
                                <span style="color: #2c3e50; font-size: 15px; font-weight: 600;">{categoria} - {asunto_ticket}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="border-top: 1px solid #edf2f7; padding-top: 15px;">
                                <span style="color: #718096; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">Resumen de tu mensaje</span>
                                <p style="color: #4a5568; font-size: 14px; line-height: 1.5; margin: 5px 0 0 0; font-style: italic;">
                                    "{desc_resumen}"
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <div style="text-align: center; margin-bottom: 10px;">
            <a href="{config.frontend_url.rstrip("/")}/tickets/{ticket_id}" style="background-color: #002060; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
                Ver Estado en el Portal
            </a>
        </div>
        """

        html_final = EmailService._get_base_layout(titulo, cuerpo_especifico)
        return await EmailService.enviar_correo(
            asunto, 
            destinatarios, 
            html_final, 
            attachments=EmailService._get_attachments(),
            message_id=EmailService._get_ticket_message_id(ticket_id)
        )
    @staticmethod
    async def enviar_notificacion_chat(
        email_destinatario: str,
        nombre_destinatario: str,
        ticket_id: str,
        asunto_ticket: str,
        nombre_remitente: str,
        mensaje: str
    ) -> bool:
        """Envía una notificación de nuevo mensaje en el chat"""
        # Mantener el asunto idéntico (o con Re:) para favorecer el threading
        asunto = EmailService._standardize_ticket_subject(ticket_id, asunto_ticket, es_respuesta=True)
        
        try:
            # Limitar mensaje si es muy largo
            mensaje_resumen = (mensaje[:500] + "...") if len(mensaje) > 500 else mensaje
            
            portal_url = f"{EmailService.get_frontend_url()}/tickets/{ticket_id}"
            
            html_final = EmailService._render_template(
                "emails/chat_notification.html",
                titulo="Nuevo mensaje en el chat",
                nombre_destinatario=nombre_destinatario,
                ticket_id=ticket_id,
                nombre_remitente=nombre_remitente,
                mensaje=mensaje_resumen,
                portal_url=portal_url
            )
            
            return await EmailService.enviar_correo(
                asunto, 
                [email_destinatario], 
                html_final, 
                attachments=EmailService._get_attachments(),
                in_reply_to=EmailService._get_ticket_message_id(ticket_id)
            )
        except Exception as e:
            print(f"ERROR al enviar notificación de chat: {e}")
            return False

    @staticmethod
    async def enviar_notificacion_cambio_estado(
        email_destinatario: str,
        nombre_destinatario: str,
        ticket_id: str,
        asunto_ticket: str,
        nuevo_estado: str,
        comentario: Optional[str] = None
    ) -> bool:
        """Notifica al usuario que el estado de su ticket ha cambiado"""
        asunto = EmailService._standardize_ticket_subject(ticket_id, asunto_ticket, es_respuesta=True)
        
        # Mapeo de colores por estado
        colores = {
            "Pendiente": {"fondo": "#fef3c7", "texto": "#92400e", "borde": "#fde68a"},
            "Proceso": {"fondo": "#e0f2fe", "texto": "#075985", "borde": "#bae6fd"},
            "Resuelto": {"fondo": "#dcfce7", "texto": "#166534", "borde": "#bbf7d0"},
            "Cerrado": {"fondo": "#f1f5f9", "texto": "#334155", "borde": "#e2e8f0"},
            "Cancelado": {"fondo": "#fee2e2", "texto": "#991b1b", "borde": "#fecaca"}
        }
        
        conf_color = colores.get(nuevo_estado, {"fondo": "#ebf8ff", "texto": "#2b6cb0", "borde": "#bee3f8"})
        
        try:
            portal_url = f"{EmailService.get_frontend_url()}/tickets/{ticket_id}"
            
            html_final = EmailService._render_template(
                "emails/status_update.html",
                titulo="Actualización de Estado",
                nombre_destinatario=nombre_destinatario,
                ticket_id=ticket_id,
                nuevo_estado=nuevo_estado,
                comentario_resolucion=comentario,
                portal_url=portal_url,
                color_fondo=conf_color["fondo"],
                color_texto=conf_color["texto"],
                color_borde=conf_color["borde"]
            )
            
            return await EmailService.enviar_correo(
                asunto, 
                [email_destinatario], 
                html_final, 
                attachments=EmailService._get_attachments(),
                in_reply_to=EmailService._get_ticket_message_id(ticket_id)
            )
        except Exception as e:
            print(f"ERROR al enviar notificación de cambio de estado: {e}")
            return False

    @staticmethod
    async def enviar_notificacion_reseteo_clave(email: str, nombre: str) -> bool:
        """Notifica al usuario que su contraseña ha sido reseteada por escalado de rol"""
        asunto = "⚠️ Seguridad Solid: Reseteo de contraseña por escalado"
        
        try:
            html_final = EmailService._render_template(
                "emails/security_reset.html",
                titulo="Acción de Seguridad Requerida",
                nombre=nombre,
                login_url=f"{EmailService.get_frontend_url()}/login"
            )
            
            return await EmailService.enviar_correo(
                asunto, 
                [email], 
                html_final, 
                attachments=EmailService._get_attachments()
            )
        except Exception as e:
            print(f"ERROR al renderizar/enviar correo de reseteo: {e}")
            return False

    @staticmethod
    async def enviar_recuperacion_contrasena(email: str, nombre: str, reset_url: str) -> bool:
        """Envía el correo de recuperación de contraseña"""
        asunto = "Recuperación de Contraseña - Portal de Servicios Solid"
        
        try:
            html_final = EmailService._render_template(
                "emails/password_recovery.html",
                titulo="Recuperación de Contraseña",
                nombre=nombre,
                reset_url=reset_url
            )
            
            return await EmailService.enviar_correo(
                asunto, 
                [email], 
                html_final, 
                attachments=EmailService._get_attachments()
            )
        except Exception as e:
            print(f"ERROR al renderizar/enviar correo de recuperación: {e}")
            return False
