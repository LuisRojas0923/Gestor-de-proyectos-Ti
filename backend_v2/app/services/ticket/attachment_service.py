from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket.ticket import AdjuntoTicket, AdjuntoCrear, HistorialTicket


class AttachmentService:
    @staticmethod
    async def registrar_historial_interno(
        db: AsyncSession,
        ticket_id: str,
        accion: str,
        detalle: str,
    ):
        """Helper interno para registrar eventos (Async)"""
        log = HistorialTicket(ticket_id=ticket_id, accion=accion, detalle=detalle)
        db.add(log)

    @classmethod
    async def subir_adjunto(
        cls, db: AsyncSession, ticket_id: str, adjunto: AdjuntoCrear
    ) -> AdjuntoTicket:
        """Sube un archivo adjunto a un ticket (Async)"""
        nuevo_adjunto = AdjuntoTicket(
            ticket_id=ticket_id,
            nombre_archivo=adjunto.nombre_archivo,
            contenido_base64=adjunto.contenido_base64,
            tipo_mime=adjunto.tipo_mime,
        )
        db.add(nuevo_adjunto)
        await cls.registrar_historial_interno(
            db,
            ticket_id,
            "Archivo Adjunto",
            f"Se adjunto el archivo: {adjunto.nombre_archivo}",
        )
        await db.commit()
        await db.refresh(nuevo_adjunto)
        return nuevo_adjunto
