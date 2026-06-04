"""
Servicio de Comentarios para Tickets - Backend V2
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlmodel import select
from fastapi import BackgroundTasks

from app.models.ticket.ticket import Ticket, ComentarioTicket, ComentarioCrear
from app.models.auth.usuario import Usuario
from app.services.notifications.email_service import EmailService
from app.utils_cache import global_cache
from .ws_manager import manager


class CommentService:
    """Clase especializada en la gestión de comentarios de tickets"""

    @staticmethod
    async def _obtener_usuario_por_nombre(db: AsyncSession, nombre: str) -> Optional[Usuario]:
        """Helper local para resolver un usuario por su nombre exacto"""
        if not nombre:
            return None
        result = await db.execute(select(Usuario).where(Usuario.nombre == nombre))
        return result.scalars().first()

    @staticmethod
    async def _obtener_ticket_con_detalles(db: AsyncSession, ticket_id: str) -> Optional[Ticket]:
        """Helper local para obtener un ticket con sus relaciones cargadas"""
        try:
            result = await db.execute(
                select(Ticket, Usuario.correo_verificado)
                .outerjoin(Usuario, Ticket.creador_id == Usuario.id)
                .where(Ticket.id == ticket_id)
                .options(
                    joinedload(Ticket.solicitud_activo),
                    joinedload(Ticket.solicitud_desarrollo),
                    joinedload(Ticket.control_cambios),
                    selectinload(Ticket.adjuntos),
                    selectinload(Ticket.comentarios),
                )
            )
            row = result.first()
            if not row:
                return None

            ticket, verificado = row
            ticket.correo_verificado_creador = bool(verificado) if verificado is not None else False
            return ticket
        except Exception as e:
            import logging
            logging.error(f"ERROR en _obtener_ticket_con_detalles ({ticket_id}): {str(e)}")
            res_simple = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
            return res_simple.scalars().first()

    @classmethod
    async def agregar_comentario(
        cls, db: AsyncSession, ticket_id: str, comentario_data: ComentarioCrear, background_tasks: Optional[BackgroundTasks] = None
    ) -> ComentarioTicket:
        """Agrega un comentario y dispara notificación si aplica"""
        try:
            nuevo_comentario = ComentarioTicket(
                ticket_id=ticket_id,
                comentario=comentario_data.comentario,
                es_interno=comentario_data.es_interno,
                usuario_id=comentario_data.usuario_id,
                nombre_usuario=comentario_data.nombre_usuario,
            )
            db.add(nuevo_comentario)
            await db.commit()
            await db.refresh(nuevo_comentario)

            # Lógica de notificación Bidireccional:
            if not nuevo_comentario.es_interno:
                ticket = await cls._obtener_ticket_con_detalles(db, ticket_id)
                if ticket:
                    es_solicitante = False
                    # Caso A: El creador del ticket responde -> Notificar al analista asignado
                    if str(nuevo_comentario.usuario_id) == str(ticket.creador_id):
                        if ticket.asignado_a:
                            analista = await cls._obtener_usuario_por_nombre(db, ticket.asignado_a)
                            if analista and analista.correo:
                                destinatario_email = analista.correo
                                nombre_destinatario = analista.nombre
                    
                    # Caso B: Alguien más responde (Analista u otro) -> Notificar al creador
                    else:
                        destinatario_email = ticket.correo_creador
                        nombre_destinatario = ticket.nombre_creador or "Usuario"
                        es_solicitante = True

                    # Definir variables de email antes del bloque condicional
                    if 'destinatario_email' in locals() and destinatario_email:
                        # THROTTLE: 30 min por ticket/destinatario para evitar spam
                        cache_key = f"chat_notif_throttle:{ticket_id}:{destinatario_email}"
                        if not global_cache.get(cache_key):
                            try:
                                if background_tasks:
                                    background_tasks.add_task(
                                        EmailService.enviar_notificacion_chat,
                                        email_destinatario=destinatario_email,
                                        nombre_destinatario=nombre_destinatario,
                                        ticket_id=ticket_id,
                                        asunto_ticket=ticket.asunto,
                                        nombre_remitente=nuevo_comentario.nombre_usuario or "Soporte",
                                        mensaje=nuevo_comentario.comentario,
                                        es_solicitante=es_solicitante,
                                    )
                                else:
                                    await EmailService.enviar_notificacion_chat(
                                        email_destinatario=destinatario_email,
                                        nombre_destinatario=nombre_destinatario,
                                        ticket_id=ticket_id,
                                        asunto_ticket=ticket.asunto,
                                        nombre_remitente=nuevo_comentario.nombre_usuario or "Soporte",
                                        mensaje=nuevo_comentario.comentario,
                                        es_solicitante=es_solicitante,
                                    )
                                global_cache.set(cache_key, True, ttl=1800)
                            except Exception as e:
                                print(f"WARNING: No se pudo enviar notificación de chat: {e}")
                
            # Notificaciones nativas para comentarios
            if not nuevo_comentario.es_interno:
                try:
                    from app.services.notificacion.servicio import ServicioNotificacion
                    from app.models.alerta.notificacion import NotificacionUsuarioCrear
                    ticket = await cls._obtener_ticket_con_detalles(db, ticket_id)
                    if ticket:
                        # Si fue respuesta del creador -> Notificar al analista
                        if str(nuevo_comentario.usuario_id) == str(ticket.creador_id):
                            if ticket.asignado_a:
                                analista = await cls._obtener_usuario_por_nombre(db, ticket.asignado_a)
                                if analista:
                                    await ServicioNotificacion.crear_notificacion(
                                        db,
                                        NotificacionUsuarioCrear(
                                            usuario_id=analista.id,
                                            titulo="Nuevo mensaje en ticket",
                                            mensaje=f"{nuevo_comentario.nombre_usuario} comentó en {ticket_id}: {nuevo_comentario.comentario[:60]}...",
                                            tipo_evento="nuevo_comentario",
                                            referencia_id=ticket_id
                                        )
                                    )
                        # Si fue respuesta del analista -> Notificar al creador
                        else:
                            await ServicioNotificacion.crear_notificacion(
                                db,
                                NotificacionUsuarioCrear(
                                    usuario_id=ticket.creador_id,
                                    titulo="Nuevo mensaje en ticket",
                                    mensaje=f"{nuevo_comentario.nombre_usuario} comentó en {ticket_id}: {nuevo_comentario.comentario[:60]}...",
                                    tipo_evento="nuevo_comentario",
                                    referencia_id=ticket_id
                                )
                            )
                except Exception as e_notif:
                    import logging
                    logging.getLogger(__name__).warning(f"Error creando notificación de comentario: {e_notif}")

            # Notificación en tiempo real vía WebSocket
            try:
                await manager.broadcast_to_ticket(ticket_id, {
                    "type": "new_comment",
                    "data": {
                        "id": nuevo_comentario.id,
                        "comentario": nuevo_comentario.comentario,
                        "nombre_usuario": nuevo_comentario.nombre_usuario,
                        "creado_en": str(nuevo_comentario.creado_en),
                        "es_interno": nuevo_comentario.es_interno
                    }
                })
            except Exception as ws_err:
                print(f"WARNING: No se pudo notificar vía WebSocket: {ws_err}")

            return nuevo_comentario
        except Exception as e:
            await db.rollback()
            raise e
