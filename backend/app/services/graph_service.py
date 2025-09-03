import msgraph.core
from msgraph.core import GraphClient
from azure.identity import ClientSecretCredential
import logging
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

class MicrosoftGraphService:
    def __init__(self):
        self.client = None
        self.setup_client()
    
    def setup_client(self):
        """Initialize Microsoft Graph client with credentials"""
        try:
            tenant_id = os.getenv("MS_TENANT_ID")
            client_id = os.getenv("MS_CLIENT_ID")
            client_secret = os.getenv("MS_CLIENT_SECRET")
            
            if not all([tenant_id, client_id, client_secret]):
                logging.warning("Microsoft Graph credentials not fully configured")
                return
            
            # Create credential
            credential = ClientSecretCredential(
                tenant_id=tenant_id,
                client_id=client_id,
                client_secret=client_secret
            )
            
            # Create Graph client
            self.client = GraphClient(credential=credential)
            logging.info("Microsoft Graph client initialized successfully")
            
        except Exception as e:
            logging.error(f"Failed to initialize Microsoft Graph client: {e}")
            self.client = None
    
    async def send_email(self, to_recipients: List[str], subject: str, body: str, 
                        cc_recipients: Optional[List[str]] = None, 
                        is_html: bool = True) -> Dict:
        """Send email using Microsoft Graph API"""
        if not self.client:
            return {
                "success": False,
                "error": "Microsoft Graph client not initialized"
            }
        
        try:
            # Prepare email message
            message = {
                "subject": subject,
                "body": {
                    "contentType": "HTML" if is_html else "Text",
                    "content": body
                },
                "toRecipients": [
                    {"emailAddress": {"address": email}} for email in to_recipients
                ]
            }
            
            # Add CC recipients if provided
            if cc_recipients:
                message["ccRecipients"] = [
                    {"emailAddress": {"address": email}} for email in cc_recipients
                ]
            
            # Send email
            response = self.client.post(
                "/users/me/sendMail",
                json={"message": message, "saveToSentItems": True}
            )
            
            if response.status_code == 202:  # Accepted
                logging.info(f"Email sent successfully to {to_recipients}")
                return {
                    "success": True,
                    "message_id": "sent",
                    "recipients": to_recipients
                }
            else:
                logging.error(f"Failed to send email: {response.status_code}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "details": response.text
                }
                
        except Exception as e:
            logging.error(f"Error sending email: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_requirement_notification(self, requirement_data: Dict, 
                                          recipient_email: str, 
                                          notification_type: str = "notification") -> Dict:
        """Send notification about a requirement"""
        try:
            # Create email content based on notification type
            if notification_type == "notification":
                subject = f"Nuevo Requerimiento: {requirement_data.get('title', 'Sin título')}"
                body = self._create_notification_email_body(requirement_data)
            elif notification_type == "reminder":
                subject = f"Recordatorio: Requerimiento Pendiente - {requirement_data.get('title', 'Sin título')}"
                body = self._create_reminder_email_body(requirement_data)
            elif notification_type == "update":
                subject = f"Actualización: {requirement_data.get('title', 'Sin título')}"
                body = self._create_update_email_body(requirement_data)
            else:
                subject = f"Comunicación: {requirement_data.get('title', 'Sin título')}"
                body = self._create_generic_email_body(requirement_data)
            
            # Send email
            result = await self.send_email(
                to_recipients=[recipient_email],
                subject=subject,
                body=body,
                is_html=True
            )
            
            return result
            
        except Exception as e:
            logging.error(f"Error sending requirement notification: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_weekly_report(self, report_data: Dict, 
                                recipient_emails: List[str]) -> Dict:
        """Send weekly progress report"""
        try:
            subject = f"Reporte Semanal - Gestión de Requerimientos - {datetime.now().strftime('%d/%m/%Y')}"
            body = self._create_weekly_report_body(report_data)
            
            # Send email to all recipients
            result = await self.send_email(
                to_recipients=recipient_emails,
                subject=subject,
                body=body,
                is_html=True
            )
            
            return result
            
        except Exception as e:
            logging.error(f"Error sending weekly report: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_user_calendar_events(self, user_id: str = "me", 
                                     start_date: Optional[datetime] = None,
                                     end_date: Optional[datetime] = None) -> Dict:
        """Get calendar events for a user"""
        if not self.client:
            return {
                "success": False,
                "error": "Microsoft Graph client not initialized"
            }
        
        try:
            # Set default dates if not provided
            if not start_date:
                start_date = datetime.now()
            if not end_date:
                end_date = start_date + timedelta(days=7)
            
            # Format dates for API
            start_str = start_date.isoformat() + "Z"
            end_str = end_date.isoformat() + "Z"
            
            # Get calendar events
            response = self.client.get(
                f"/users/{user_id}/calendarView",
                params={
                    "startDateTime": start_str,
                    "endDateTime": end_str
                }
            )
            
            if response.status_code == 200:
                events = response.json().get("value", [])
                logging.info(f"Retrieved {len(events)} calendar events")
                return {
                    "success": True,
                    "events": events
                }
            else:
                logging.error(f"Failed to get calendar events: {response.status_code}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}"
                }
                
        except Exception as e:
            logging.error(f"Error getting calendar events: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _create_notification_email_body(self, requirement_data: Dict) -> str:
        """Create HTML body for requirement notification"""
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0066A5;">Nuevo Requerimiento Recibido</h2>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #495057;">{requirement_data.get('title', 'Sin título')}</h3>
                    
                    <p><strong>Descripción:</strong></p>
                    <p>{requirement_data.get('description', 'Sin descripción')}</p>
                    
                    <div style="display: flex; gap: 20px; margin-top: 15px;">
                        <div>
                            <strong>Prioridad:</strong> 
                            <span style="color: {self._get_priority_color(requirement_data.get('priority', 'medium'))}">
                                {requirement_data.get('priority', 'medium').upper()}
                            </span>
                        </div>
                        <div>
                            <strong>Tipo:</strong> {requirement_data.get('type', 'N/A')}
                        </div>
                    </div>
                </div>
                
                <p>Este requerimiento ha sido asignado y está siendo procesado por nuestro equipo.</p>
                
                <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                    Este es un mensaje automático del sistema de gestión de requerimientos.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _create_reminder_email_body(self, requirement_data: Dict) -> str:
        """Create HTML body for requirement reminder"""
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #F59E0B;">Recordatorio: Requerimiento Pendiente</h2>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                    <h3 style="margin-top: 0; color: #856404;">{requirement_data.get('title', 'Sin título')}</h3>
                    
                    <p><strong>Estado Actual:</strong> {requirement_data.get('status', 'Pendiente')}</p>
                    <p><strong>Fecha de Creación:</strong> {requirement_data.get('created_at', 'N/A')}</p>
                    
                    <p>Por favor, actualice el estado de este requerimiento o contáctenos si necesita asistencia.</p>
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                    Este es un recordatorio automático del sistema de gestión de requerimientos.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _create_update_email_body(self, requirement_data: Dict) -> str:
        """Create HTML body for requirement update"""
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #10B981;">Actualización de Requerimiento</h2>
                
                <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10B981;">
                    <h3 style="margin-top: 0; color: #0c5460;">{requirement_data.get('title', 'Sin título')}</h3>
                    
                    <p><strong>Nuevo Estado:</strong> {requirement_data.get('status', 'N/A')}</p>
                    <p><strong>Última Actualización:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
                    
                    <p>El requerimiento ha sido actualizado en nuestro sistema.</p>
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                    Este es un mensaje automático del sistema de gestión de requerimientos.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _create_weekly_report_body(self, report_data: Dict) -> str:
        """Create HTML body for weekly report"""
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0066A5;">Reporte Semanal - Gestión de Requerimientos</h2>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #495057;">Resumen de la Semana</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                        <div style="text-align: center; padding: 10px; background-color: white; border-radius: 3px;">
                            <div style="font-size: 24px; font-weight: bold; color: #0066A5;">{report_data.get('total_requirements', 0)}</div>
                            <div style="font-size: 12px; color: #6c757d;">Total Requerimientos</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background-color: white; border-radius: 3px;">
                            <div style="font-size: 24px; font-weight: bold; color: #10B981;">{report_data.get('completed_requirements', 0)}</div>
                            <div style="font-size: 12px; color: #6c757d;">Completados</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background-color: white; border-radius: 3px;">
                            <div style="font-size: 24px; font-weight: bold; color: #F59E0B;">{report_data.get('pending_requirements', 0)}</div>
                            <div style="font-size: 12px; color: #6c757d;">Pendientes</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background-color: white; border-radius: 3px;">
                            <div style="font-size: 24px; font-weight: bold; color: #EF4444;">{report_data.get('overdue_requirements', 0)}</div>
                            <div style="font-size: 12px; color: #6c757d;">Vencidos</div>
                        </div>
                    </div>
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                    Este reporte fue generado automáticamente por el sistema de gestión de requerimientos.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _create_generic_email_body(self, requirement_data: Dict) -> str:
        """Create generic HTML body for requirement communication"""
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6c757d;">Comunicación de Requerimiento</h2>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #495057;">{requirement_data.get('title', 'Sin título')}</h3>
                    <p>{requirement_data.get('description', 'Sin descripción')}</p>
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                    Este es un mensaje automático del sistema de gestión de requerimientos.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _get_priority_color(self, priority: str) -> str:
        """Get color for priority display"""
        colors = {
            'low': '#10B981',
            'medium': '#F59E0B',
            'high': '#EF4444',
            'critical': '#DC2626'
        }
        return colors.get(priority.lower(), '#6c757d')

# Example usage
if __name__ == "__main__":
    graph_service = MicrosoftGraphService()
    
    # Test requirement data
    test_requirement = {
        "title": "Implementar autenticación OAuth2",
        "description": "Necesitamos agregar autenticación OAuth2 para integrar con servicios externos",
        "priority": "high",
        "type": "feature",
        "status": "pending"
    }
    
    print("Microsoft Graph Service initialized")
    # Note: This would need to be run in an async context
    # result = await graph_service.send_requirement_notification(test_requirement, "test@example.com")
    # print(f"Result: {result}")
