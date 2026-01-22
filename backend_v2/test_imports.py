
try:
    from sqlalchemy.orm import Session
    print("Session imported")
except ImportError as e:
    print(f"Error importing Session: {e}")

try:
    from app.models.ticket.ticket import Ticket, HistorialTicket, AdjuntoTicket
    print("Models imported")
except ImportError as e:
    print(f"Error importing Models: {e}")

try:
    from app.services.ticket.servicio import TicketService
    print("TicketService imported")
except ImportError as e:
    print(f"Error importing TicketService: {e}")
