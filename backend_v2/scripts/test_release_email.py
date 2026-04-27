import sys
import os
import asyncio

# Añadir el directorio raíz de backend_v2 al sys.path para importaciones absolutas
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.notifications.email_service import EmailService

async def main():
    destinatarios = ["mejoramiento@365rdc.com", "analista.mejoramiento6@refridcol.com", "comunidad@refridcol.com"]
    asunto = "🚀 ¡Nueva Funcionalidad: Módulo de Gestión Humana!"
    
    print("Renderizando template HTML...")
    # Renderizamos la plantilla que acabamos de crear
    html_final = EmailService._render_template(
        "emails/release_gestion_humana.html",
        titulo="Nueva Funcionalidad - Gestión Humana",
        portal_url="http://portalservicios.refridcol.com/"
    )
    
    print(f"Enviando correo de prueba a: {destinatarios}...")
    exito = await EmailService.enviar_correo(
        asunto=asunto,
        destinatarios=destinatarios,
        contenido_html=html_final,
        attachments=EmailService._get_attachments() # Incluye el Logo
    )
    
    if exito:
        print("EXITO: Correo enviado con exito. Por favor revisa las bandejas de entrada.")
    else:
        print("ERROR: al enviar el correo. Revisa la configuracion SMTP o los logs.")

if __name__ == "__main__":
    asyncio.run(main())
