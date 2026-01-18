"""
API de Tickets - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import obtener_db
from app.schemas.ticket import Ticket, TicketCrear, ComentarioTicket

router = APIRouter()


@router.get("/", response_model=List[Ticket])
async def listar_tickets(
    creador_id: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(obtener_db)
):
    """Lista tickets de soporte"""
    return []


@router.post("/", response_model=Ticket)
async def crear_ticket(
    ticket: TicketCrear, 
    db: Session = Depends(obtener_db)
):
    """Crea un nuevo ticket de soporte"""
    return ticket


@router.get("/{ticket_id}", response_model=Ticket)
async def obtener_ticket(
    ticket_id: str, 
    db: Session = Depends(obtener_db)
):
    """Obtiene detalles de un ticket"""
    raise HTTPException(status_code=404, detail="Ticket no encontrado")


@router.post("/{ticket_id}/comentarios", response_model=ComentarioTicket)
async def agregar_comentario(
    ticket_id: str,
    comentario: str,
    db: Session = Depends(obtener_db)
):
    """Agrega un comentario a un ticket"""
    return {}
