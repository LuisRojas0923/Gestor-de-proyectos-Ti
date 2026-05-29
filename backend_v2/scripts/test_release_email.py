import sys
import os
import asyncio

# Añadir el directorio raíz de backend_v2 al sys.path para importaciones absolutas
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.notifications.email_service import EmailService

async def main():
    email_dest = "mejoramiento@365rdc.com"
    token_url = "http://portalservicios.refridcol.com/verify-email?token=TEST_TOKEN"
    
    # 1. Correo de Confirmación de Registro (Verificación)
    print("\n--- 1. Enviando correo de confirmación de registro... ---")
    exito_reg = await EmailService.enviar_confirmacion_registro(
        email=email_dest,
        nombre="Usuario Mejoramiento",
        token_url=token_url
    )
    print(f"Resultado: {'ÉXITO' if exito_reg else 'FALLO'}")
    
    # 2. Correo de Recuperación de Contraseña (Prueba de caracteres no-ASCII: ó, ñ)
    print("\n--- 2. Enviando correo de recuperación de contraseña... ---")
    exito_rec = await EmailService.enviar_recuperacion_contrasena(
        email=email_dest,
        nombre="Usuario Mejoramiento",
        reset_url="http://portalservicios.refridcol.com/reset-password?token=TEST_RESET_TOKEN"
    )
    print(f"Resultado: {'ÉXITO' if exito_rec else 'FALLO'}")
    
    # 3. Correo de Confirmación de Ticket (Prueba de formato estructurado HTML y Message-ID)
    print("\n--- 3. Enviando correo de confirmación de ticket... ---")
    exito_tk = await EmailService.enviar_confirmacion_ticket(
        email=email_dest,
        nombre="Usuario Mejoramiento",
        ticket_id="TK-9999",
        asunto_ticket="Fallo de conexión en el servidor principal de base de datos",
        descripcion="El servidor principal de base de datos no responde a las solicitudes de conexión desde el host de producción. Por favor, verificar el servicio PostgreSQL y la configuración del firewall.",
        categoria="Tecnología de la Información"
    )
    print(f"Resultado: {'ÉXITO' if exito_tk else 'FALLO'}")

    # 4. Correo de Notificación de Chat (Prueba de cabeceras de hilos In-Reply-To y References)
    print("\n--- 4. Enviando correo de notificación de chat (Hilo)... ---")
    exito_chat = await EmailService.enviar_notificacion_chat(
        email_destinatario=email_dest,
        nombre_destinatario="Usuario Mejoramiento",
        ticket_id="TK-9999",
        asunto_ticket="Fallo de conexión en el servidor principal de base de datos",
        nombre_remitente="Soporte Técnico RDC",
        mensaje="Hola, hemos revisado el servidor de base de datos y parece que el servicio PostgreSQL se reinició. ¿Podrías confirmar si ya tienes acceso?",
        es_solicitante=True
    )
    print(f"Resultado: {'ÉXITO' if exito_chat else 'FALLO'}")
    
    print("\n=============================================")
    print("Pruebas finalizadas. Por favor revisa la bandeja de entrada (y la carpeta de spam) de mejoramiento@365rdc.com")
    print("=============================================")

if __name__ == "__main__":
    asyncio.run(main())
