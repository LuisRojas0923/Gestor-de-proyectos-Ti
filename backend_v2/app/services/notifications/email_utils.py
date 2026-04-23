import os
from typing import Optional, List
from app.config import config

from jinja2 import Environment, FileSystemLoader
from app.config import config

class EmailUtils:
    """Utilidades para el formateo y preparación de correos"""
    
    TEMPLATES_DIR = os.path.join(
        os.path.dirname(__file__), "..", "..", "resources", "templates"
    )
    _jinja_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

    @staticmethod
    def _render_template(template_name: str, **context) -> str:
        """Renderiza una plantilla de Jinja2"""
        template = EmailUtils._jinja_env.get_template(template_name)
        return template.render(**context)

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

    @staticmethod
    def get_frontend_url() -> str:
        """Retorna la URL del frontend configurada en el sistema"""
        return (config.hostveremail or config.frontend_url).rstrip("/")

    @staticmethod
    def _standardize_ticket_subject(ticket_id: str, asunto: str, es_respuesta: bool = False) -> str:
        """Garantiza que el asunto tenga el formato [Ticket #ID]"""
        tag = f"[Ticket #{ticket_id}]"
        asunto_limpio = asunto.strip()
        
        # Evitar duplicar el tag si ya existe
        if tag not in asunto_limpio:
            asunto_limpio = f"{tag} {asunto_limpio}"
            
        if es_respuesta and not asunto_limpio.startswith("Re:"):
            asunto_limpio = f"Re: {asunto_limpio}"
            
        return asunto_limpio

    @staticmethod
    def _get_ticket_message_id(ticket_id: str) -> str:
        """Genera un Message-ID determinista para agrupar hilos por ticket"""
        domain = "portal.refridcol.com.co"
        return f"<ticket-{ticket_id}@{domain}>"

    @staticmethod
    def _get_attachments() -> List[dict]:
        """Retorna lista de imágenes estáticas para inyectar en las plantillas (Logo, etc)"""
        base_path = os.path.join(os.path.dirname(__file__), "..", "..", "resources", "static", "images")
        return [
            {
                "path": os.path.join(base_path, "logo_refridcol.png"),
                "cid": "logo_refridcol",
                "type": "image"
            }
        ]
