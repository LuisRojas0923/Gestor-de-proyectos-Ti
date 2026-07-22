"""Autorización dinámica para recursos privados de tickets."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.auth.usuario import Usuario
from app.models.ticket.ticket import Ticket
from app.services.auth.servicio import ServicioAuth, ids_creador_ticket_equivalentes


async def usuario_puede_acceder_ticket(
    db: AsyncSession,
    ticket_id: str,
    usuario_id: str,
) -> bool:
    resultado_usuario = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = resultado_usuario.scalars().first()
    if not usuario:
        return False

    resultado_ticket = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = resultado_ticket.scalars().first()
    if not ticket:
        return False

    if ticket.creador_id in ids_creador_ticket_equivalentes(usuario.id, usuario):
        return True

    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    return "ticket-management" in permisos
