"""
Servicio de Tickets - Backend V2
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.ticket import Ticket, ComentarioTicket
from app.schemas.ticket import TicketCrear


class ServicioTicket:
    """Lgica para la gestin de tickets de soporte"""
    
    @staticmethod
    def obtener_tickets(db: Session, creador_id: Optional[str] = None):
        consulta = db.query(Ticket)
        if creador_id:
            consulta = consulta.filter(Ticket.creador_id == creador_id)
        return consulta.all()

    @staticmethod
    def crear_ticket(db: Session, ticket: TicketCrear):
        db_ticket = Ticket(**ticket.dict())
        db.add(db_ticket)
        db.commit()
        db.refresh(db_ticket)
        return db_ticket

    @staticmethod
    def agregar_comentario(db: Session, ticket_id: str, comentario: str, usuario_id: str):
        db_comentario = ComentarioTicket(
            ticket_id=ticket_id,
            comentario=comentario,
            usuario_id=usuario_id
        )
        db.add(db_comentario)
        db.commit()
        db.refresh(db_comentario)
        return db_comentario
