import os
from typing import List, Optional, Union
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from jinja2 import Environment, FileSystemLoader
from app.config import config


class EmailService:
    """Servicio para el envío de correos electrónicos vía SMTP"""

    # Configuración de Jinja2
    TEMPLATES_DIR = os.path.join(
        os.path.dirname(__file__), "..", "..", "resources", "templates"
    )
    _jinja_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

    @staticmethod
    def _render_template(template_name: str, **context) -> str:
        """Renderiza una plantilla de Jinja2"""
        template = EmailService._jinja_env.get_template(template_name)
        return template.render(**context)

    @staticmethod
    def get_frontend_url(request_host: str = None) -> str:
        """
        Retorna la URL del frontend. 
        Si se provee request_host (IP del navegador), se usa esa.
        Si no, se usa la configurada en el sistema.
        """
        # 1. Si tenemos un host de la petición actual, lo priorizamos
        if request_host:
            # Limpiamos el puerto si viene incluido
            clean_host = request_host.split(":")[0]
            return f"http://{clean_host}:5173"

        # 2. Si no hay host de petición, usamos la configuración estática
        return (config.hostveremail or config.frontend_url).rstrip("/")

        # 2. Si no hay host de petición, usamos la configuración estática
        return (config.hostveremail or config.frontend_url).rstrip("/")

    @staticmethod
    async def enviar_correo(
        asunto: str,
        destinatarios: List[str],
        contenido_html: str,
        contenido_texto: Optional[str] = None,
        attachments: Optional[List[dict]] = None,
        request_host: Optional[str] = None
    ) -> bool:
        """
        Envía un correo electrónico utilizando la configuración SMTP del sistema.
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

            final_url = EmailService.get_frontend_url(request_host)
            print(f"DEBUG: Correo enviado a {destinatarios}. URL Links: {final_url} | IP Red Detectada: {config.detected_ip}")
            return True

        except Exception as e:
            print(f"ERROR al enviar correo: {e}")
            return False

    @staticmethod
    def _get_base_layout(titulo: str, contenido_html: str) -> str:
        """
        Envuelve el contenido específico en una plantilla base universal 
        compatible con todos los clientes de Outlook y con estética Premium Corporativa.
        Usa la paleta de colores del portal (Navy Blue #002060).
        """
        navy_blue = "#002060"
        light_blue = "#f0f4f8"
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>{titulo}</title>
            <!--[if mso]>
            <style type="text/css">
                body, table, td, h1, h2, h3, h4, span, div {{ font-family: Segoe UI, Arial, sans-serif !important; }}
            </style>
            <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: {light_blue}; font-family: 'Segoe UI', Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: {light_blue};">
                <tr>
                    <td align="center" style="padding: 40px 10px;">
                        <!--[if mso]>
                        <table align="center" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px;">
                        <tr><td>
                        <![endif]-->
                        <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border-collapse: separate; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e1e8e5;">
                            <tr>
                                <td>
                                    <!-- Header Corporativo -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: {navy_blue}; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 30px 40px;">
                                                <table border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                                                    <tr>
                                                        <!-- Logo -->
                                                        <td width="50" valign="middle" style="vertical-align: middle;">
                                                            <img src="cid:logo_refridcol" alt="Refridcol Logo" width="50" height="auto" style="display: block; border: 0;">
                                                        </td>
                                                        <!-- Spacer -->
                                                        <td width="20" style="width: 20px;">&nbsp;</td>
                                                        <!-- Texto -->
                                                        <td valign="middle" style="vertical-align: middle;">
                                                            <div style="margin: 0; padding: 0;">
                                                                <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.2;">
                                                                    INDUSTRIAS <span style="color: #b4c6e7;">REFRIDCOL</span>
                                                                </h2>
                                                                <div style="color: #b4c6e7; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; font-family: 'Segoe UI', Arial, sans-serif; margin-top: 2px;">
                                                                    Portal de Servicios Solid
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Cuerpo del Correo -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="padding: 40px;">
                                                <h1 style="color: #2c3e50; font-size: 24px; font-weight: 700; text-align: left; margin: 0 0 25px 0; font-family: 'Segoe UI', Arial, sans-serif;">
                                                    {titulo}
                                                </h1>
                                                
                                                {contenido_html}
                                                
                                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #edf2f7; margin-top: 25px;">
                                                    <tr>
                                                        <td style="padding-top: 25px; text-align: center;">
                                                            <p style="color: #a0aec0; font-size: 13px; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                                                                Solid - Industrias Refridcol S.A. &copy; 2026<br>
                                                                <strong style="color: #718096;">Hacemos el mejor frío</strong><br>
                                                                <span style="font-size: 11px; color: #a0aec0;">Una iniciativa del Departamento de Desarrollo e Innovación</span>
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                        <!--[if mso]>
                        </td></tr></table>
                        <![endif]-->
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

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
    def enviar_notificacion_actualizacion(email: str, nombre: str):
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
        return EmailService.enviar_correo(
            asunto, 
            [email], 
            html_final, 
            attachments=EmailService._get_attachments()
        )

    @staticmethod
    def enviar_confirmacion_registro(email: str, nombre: str, token_url: str) -> bool:
        """Envía un correo de verificación de cuenta profesional usando plantillas premium"""
        asunto = "Verifica tu correo - Portal de Servicios Solid"
        
        try:
            html_final = EmailService._render_template(
                "emails/verify_email.html",
                titulo="Confirmación de Correo",
                nombre=nombre,
                verify_url=token_url
            )
            
            return EmailService.enviar_correo(
                asunto, 
                [email], 
                html_final, 
                attachments=EmailService._get_attachments()
            )
        except Exception as e:
            print(f"ERROR al renderizar/enviar correo de verificación: {e}")
            return False

    @staticmethod
    def enviar_exito_verificacion(email: str, nombre: str) -> bool:
        """Envía un correo de éxito tras verificar la cuenta"""
        asunto = "¡Tu correo ha sido verificado! - Portal de Servicios Solid"
        
        try:
            from app.config import config
            html_final = EmailService._render_template(
                "emails/verification_success.html",
                titulo="Correo Verificado",
                nombre=nombre,
                login_url=f"{EmailService.get_frontend_url()}/login"
            )
            
            return EmailService.enviar_correo(
                asunto, 
                [email], 
                html_final, 
                attachments=EmailService._get_attachments()
            )
        except Exception as e:
            print(f"ERROR al renderizar/enviar correo de éxito: {e}")
            return False

    @staticmethod
    def enviar_confirmacion_ticket(
        email: Union[str, List[str]],
        nombre: str,
        ticket_id: str,
        asunto_ticket: str,
        descripcion: str,
        categoria: str,
    ) -> bool:
        """Envía un correo de acuse de recibo premium con los colores del portal (Navy Blue)"""
        asunto = f"Recibimos tu solicitud: {ticket_id}"
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
        return EmailService.enviar_correo(
            asunto, 
            destinatarios, 
            html_final, 
            attachments=EmailService._get_attachments()
        )
    @staticmethod
    async def enviar_notificacion_chat(
        email_destinatario: str,
        nombre_destinatario: str,
        ticket_id: str,
        nombre_remitente: str,
        mensaje: str,
        request_host: str = None
    ) -> bool:
        """Envía una notificación de nuevo mensaje en el chat"""
        asunto = f"Nuevo mensaje en tu solicitud: {ticket_id}"
        
        try:
            # Limitar mensaje si es muy largo
            mensaje_resumen = (mensaje[:500] + "...") if len(mensaje) > 500 else mensaje
            
            portal_url = f"{EmailService.get_frontend_url(request_host)}/tickets/{ticket_id}"
            
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
                request_host=request_host
            )
        except Exception as e:
            print(f"ERROR al enviar notificación de chat: {e}")
            return False

    @staticmethod
    async def enviar_notificacion_reseteo_clave(email: str, nombre: str, request_host: str = None) -> bool:
        """Notifica al usuario que su contraseña ha sido reseteada por escalado de rol"""
        asunto = "⚠️ Seguridad Solid: Reseteo de contraseña por escalado"
        
        try:
            html_final = EmailService._render_template(
                "emails/security_reset.html",
                titulo="Acción de Seguridad Requerida",
                nombre=nombre,
                login_url=f"{EmailService.get_frontend_url(request_host)}/login"
            )
            
            return await EmailService.enviar_correo(
                asunto, 
                [email], 
                html_final, 
                attachments=EmailService._get_attachments(),
                request_host=request_host
            )
        except Exception as e:
            print(f"ERROR al renderizar/enviar correo de reseteo: {e}")
            return False

    @staticmethod
    async def enviar_recuperacion_contrasena(email: str, nombre: str, reset_url: str, request_host: str = None) -> bool:
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
                attachments=EmailService._get_attachments(),
                request_host=request_host
            )
        except Exception as e:
            print(f"ERROR al renderizar/enviar correo de recuperación: {e}")
            return False
