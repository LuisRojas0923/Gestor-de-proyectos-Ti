"""
Schemas de Tickets - Backend V2
"""
from .ticket import (
    CategoriaTicketBase, CategoriaTicket, TicketBase, 
    TicketCrear, TicketActualizar, Ticket, 
    ComentarioTicketBase, ComentarioTicket,
    HistorialTicketBase, HistorialTicket,
    AdjuntoTicketBase, AdjuntoTicketCrear, AdjuntoTicket, AdjuntoTicketCompleto
)

__all__ = [
    "CategoriaTicketBase", "CategoriaTicket", "TicketBase", 
    "TicketCrear", "TicketActualizar", "Ticket", 
    "ComentarioTicketBase", "ComentarioTicket",
    "HistorialTicketBase", "HistorialTicket",
    "AdjuntoTicketBase", "AdjuntoTicketCrear", "AdjuntoTicket", "AdjuntoTicketCompleto"
]

