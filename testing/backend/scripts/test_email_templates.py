import sys
import os

# Añadir el path al backend para poder importar EmailService
sys.path.append(os.path.join(os.getcwd(), "backend_v2"))

from app.services.notifications.email_service import EmailService

def send_test_emails(destinatarios):
    print(f"Enviando correos de prueba a: {destinatarios}")
    try:
        for email in destinatarios:
            print(f"\n--- Probando con: {email} ---")
            
            # 1. Probar Correo de Verificación
            sent_verify = EmailService.enviar_confirmacion_registro(
                email=email,
                nombre="Usuario de Prueba",
                token_url="https://portal.refridcol.com/verify-email?token=token-de-prueba-123"
            )
            if sent_verify:
                print(f"[SUCCESS] Correo de VERIFICACIÓN enviado a {email}")
            else:
                print(f"[FAILURE] Error al enviar VERIFICACIÓN a {email}")
            
            # 2. Probar Correo de Éxito
            sent_success = EmailService.enviar_exito_verificacion(
                email=email,
                nombre="Usuario de Prueba"
            )
            if sent_success:
                print(f"[SUCCESS] Correo de ÉXITO enviado a {email}")
            else:
                print(f"[FAILURE] Error al enviar ÉXITO a {email}")
                
    except Exception as e:
        print(f"[ERROR] Error crítico durante el envío: {e}")

if __name__ == "__main__":
    emails_to_test = [
        "mejoramiento@REFRIDCOL.onmicrosoft.com",
        "analista.mejoramiento6@refridcol.com"
    ]
    send_test_emails(emails_to_test)
