import sys
import os

# Añadir el path al backend para poder importar los módulos de la app
sys.path.append(os.path.join(os.getcwd(), "backend_v2"))

from app.services.notifications.email_service import EmailService
from app.services.auth.servicio import ServicioAuth
from app.config import config

def test_full_verification_flow(target_email, user_id=1, user_name="Usuario de Prueba"):
    """
    Prueba el flujo completo:
    1. Generación de token JWT real.
    2. Construcción de la URL de verificación (usando config).
    3. Envío del correo usando la plantilla Premium.
    """
    print(f"--- Iniciando prueba de flujo de verificación ---")
    print(f"Destino: {target_email}")
    print(f"Frontend URL: {config.frontend_url}")
    print(f"Host Verificación (HOSTVEREMAIL): {config.hostveremail}")
    
    try:
        # 1. Crear Token Real
        token = ServicioAuth.crear_token_verificacion(user_id)
        print(f"[OK] Token generado exitosamente")
        
        # 2. Construir URL
        base_url = (config.hostveremail or config.frontend_url).rstrip("/")
        verify_url = f"{base_url}/verify-email?token={token}"
        print(f"[OK] URL de verificación: {verify_url}")
        
        # 3. Enviar Correo
        print(f"Enviando correo...")
        sent = EmailService.enviar_confirmacion_registro(
            email=target_email,
            nombre=user_name,
            token_url=verify_url
        )
        
        if sent:
            print(f"\n[SUCCESS] El correo de verificación ha sido enviado exitosamente.")
            print(f"Revisa tu bandeja de entrada en: {target_email}")
        else:
            print(f"\n[FAILURE] El servicio de correo no pudo entregar el mensaje.")
            print(f"Verifica tus credenciales SMTP en el archivo .env")
            
    except Exception as e:
        print(f"\n[ERROR] Ocurrió un fallo durante la prueba: {e}")

if __name__ == "__main__":
    emails_to_test = [
        "mejoramiento@REFRIDCOL.onmicrosoft.com",
        "analista.mejoramiento6@refridcol.com"
    ]
    
    for email in emails_to_test:
        test_full_verification_flow(email)
        print("-" * 40)
