"""
Servicio de Mantenimiento de Tickets - Backend V2
"""
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.ticket.ticket import Ticket
from app.utils_date import get_bogota_now
from .servicio import ServicioTicket

class ServicioMantenimientoTicket:
    """Lógica para mantenimiento automático de tickets"""
    
    @staticmethod
    async def cerrar_tickets_resueltos_vencidos(db: AsyncSession) -> int:
        """
        Busca tickets en estado 'Resuelto' cuya fecha de resolución 
        sea mayor a 24 horas y los cambia a 'Cerrado'.
        """
        ahora = get_bogota_now()
        limite_24h = ahora - timedelta(hours=24)
        
        # 1. Buscar tickets candidatos
        result = await db.execute(
            select(Ticket).where(
                Ticket.estado == "Resuelto",
                Ticket.resuelto_en <= limite_24h
            )
        )
        tickets_a_cerrar = result.scalars().all()
        
        conteo = 0
        for ticket in tickets_a_cerrar:
            # 2. Actualizar estado
            ticket.estado = "Cerrado"
            ticket.fecha_cierre = ahora
            
            # 3. Registrar en historial
            await ServicioTicket.registrar_historial(
                db, 
                ticket.id, 
                "Cierre Automatico", 
                "Ticket cerrado automaticamente tras 24 horas en estado Resuelto",
                usuario_id="SISTEMA",
                nombre_usuario="Proceso de Mantenimiento"
            )
            conteo += 1
            
        if conteo > 0:
            await db.commit()
            
        return conteo
