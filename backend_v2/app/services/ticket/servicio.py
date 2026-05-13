"""
Servicio de Tickets - Backend V2 (Facade)
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import joinedload, selectinload
from sqlmodel import select
from fastapi import HTTPException, BackgroundTasks

from app.models.ticket.ticket import (
    Ticket,
    SolicitudDesarrollo,
    ControlCambios,
    SolicitudActivo,
    TicketCrear,
    TicketActualizar,
    ComentarioTicket,
    ComentarioCrear,
)
from app.models.auth.usuario import Usuario
from app.utils_date import get_bogota_now

# Importación de servicios especializados
from .stats_service import StatService
from .category_service import CategoryService
from .attachment_service import AttachmentService
from .ticket_utils import TicketUtils
from .list_service import TicketListService
from ..notifications.email_service import EmailService
from ...models.ticket.ticket import CategoriaTicket
from ...utils_cache import global_cache
from .ws_manager import manager


class ServicioTicket:
    """Servicio principal para gestion de tickets (Facade)"""

    # Delegación de estadísticas
    obtener_estadisticas_resumen = StatService.obtener_estadisticas_resumen
    obtener_estadisticas_avanzadas = StatService.obtener_estadisticas_avanzadas

    # Delegación de utilidades
    obtener_analista_menos_cargado = TicketUtils.obtener_analista_menos_cargado
    registrar_historial = TicketUtils.registrar_historial

    # Delegación de categorías y adjuntos
    listar_categorias = CategoryService.listar_categorias
    subir_adjunto = AttachmentService.subir_adjunto
    
    # Delegación de listado
    listar_tickets = TicketListService.listar_tickets

    @staticmethod
    async def _obtener_usuario_por_nombre(db: AsyncSession, nombre: str) -> Optional[Usuario]:
        """Helper para resolver un usuario por su nombre exacto (usado para analistas)"""
        if not nombre:
            return None
        result = await db.execute(select(Usuario).where(Usuario.nombre == nombre))
        return result.scalars().first()

    @classmethod
    async def crear_ticket(
        cls, db: AsyncSession, ticket_data: TicketCrear, background_tasks: Optional[BackgroundTasks] = None
    ) -> Ticket:
        """Crea un nuevo ticket (Async)"""
        # Validación obligatoria de correo para notificaciones
        if not ticket_data.correo_creador or "@" not in ticket_data.correo_creador:
            raise HTTPException(
                status_code=400,
                detail="Se requiere un correo corporativo válido para recibir notificaciones del ticket.",
            )

        try:
            # Validación de estado de verificación de correo
            usuario_res = await db.execute(select(Usuario).where(Usuario.id == ticket_data.creador_id))
            usuario_obj = usuario_res.scalars().first()
            
            if usuario_obj and not usuario_obj.correo_verificado:
                raise HTTPException(
                    status_code=403,
                    detail="Tu correo corporativo no ha sido verificado. Por favor, revisa tu bandeja de entrada o solicita un nuevo código desde tu perfil para poder crear tickets."
                )

            result_seq = await db.execute(text("SELECT nextval('ticket_id_seq')"))
            next_val = result_seq.scalar()
            ticket_id = f"TKT-{next_val:04d}"

            nuevo_ticket = Ticket(
                id=ticket_id,
                categoria_id=ticket_data.categoria_id,
                asunto=ticket_data.asunto,
                descripcion=ticket_data.descripcion,
                creador_id=ticket_data.creador_id,
                nombre_creador=ticket_data.nombre_creador,
                correo_creador=ticket_data.correo_creador,
                area_creador=ticket_data.area_creador,
                cargo_creador=ticket_data.cargo_creador,
                sede_creador=ticket_data.sede_creador,
                prioridad=ticket_data.prioridad or "Media",
                estado="Pendiente",
                sub_estado="Asignado",
                datos_extra=ticket_data.datos_extra,
                areas_impactadas=ticket_data.areas_impactadas,
            )

            analista = await cls.obtener_analista_menos_cargado(
                db,
                categoria_id=ticket_data.categoria_id,
                area_solicitante=ticket_data.area_creador,
            )
            if analista:
                nuevo_ticket.asignado_a = analista
            else:
                nuevo_ticket.sub_estado = "Sin Asignar"

            db.add(nuevo_ticket)
            await cls.registrar_historial(
                db,
                ticket_id,
                "Creacion",
                f"Ticket creado por {ticket_data.nombre_creador}",
            )

            if analista:
                await cls.registrar_historial(
                    db,
                    ticket_id,
                    "Asignacion Automatica",
                    f"Asignado a {analista} por balanceo de carga",
                )

            # Extensiones
            # Extensiones
            if ticket_data.que_necesita or ticket_data.porque:
                db.add(
                    SolicitudDesarrollo(
                        ticket_id=ticket_id,
                        que_necesita=ticket_data.que_necesita,
                        porque=ticket_data.porque,
                        paraque=ticket_data.paraque,
                        justificacion_ia=ticket_data.justificacion_ia,
                    )
                )

            if ticket_data.categoria_id == "control_cambios" or (
                ticket_data.tipo_objeto and ticket_data.accion_requerida
            ):
                db.add(
                    ControlCambios(
                        ticket_id=ticket_id,
                        desarrollo_id=ticket_data.desarrollo_id,
                        modulo_solid_id=ticket_data.modulo_solid_id,
                        componente_solid_id=ticket_data.componente_solid_id,
                        tipo_objeto=ticket_data.tipo_objeto or "No especificado",
                        accion_requerida=ticket_data.accion_requerida
                        or "No especificada",
                        impacto_operativo=ticket_data.impacto_operativo or "Bajo",
                        justificacion=ticket_data.justificacion_cambio or "",
                        descripcion_cambio=ticket_data.descripcion_cambio or "",
                    )
                )

            # Solicitud de Activo (Hardware, Software, Licencias)
            # Busqueda robusta: raíz o datos_extra
            item = ticket_data.item_solicitado
            especs = ticket_data.especificaciones
            cant = ticket_data.cantidad

            if not item and ticket_data.datos_extra:
                item = ticket_data.datos_extra.get(
                    "hardware_solicitado"
                ) or ticket_data.datos_extra.get("item_solicitado")

            if not especs and ticket_data.datos_extra:
                especs = ticket_data.datos_extra.get("especificaciones")

            if (not cant or cant == 1) and ticket_data.datos_extra:
                try:
                    cant_extra = ticket_data.datos_extra.get("cantidad")
                    if cant_extra:
                        cant = int(cant_extra)
                except (ValueError, TypeError):
                    pass

            if item or especs:
                db.add(
                    SolicitudActivo(
                        ticket_id=ticket_id,
                        item_solicitado=item or "PRODUCTO/SERVICIO",
                        especificaciones=especs,
                        cantidad=cant or 1,
                    )
                )

            await db.commit()

            # Notificación de Asignación al Analista (Nueva prioridad)
            try:
                if nuevo_ticket.asignado_a:
                    analista_obj = await cls._obtener_usuario_por_nombre(db, nuevo_ticket.asignado_a)
                    if analista_obj and analista_obj.correo:
                        res_cat = await db.execute(
                            select(CategoriaTicket).where(CategoriaTicket.id == ticket_data.categoria_id)
                        )
                        cat_obj = res_cat.scalars().first()
                        cat_nombre = cat_obj.nombre if cat_obj else ticket_data.categoria_id

                        if background_tasks:
                            background_tasks.add_task(
                                EmailService.enviar_aviso_asignacion,
                                email_analista=analista_obj.correo,
                                nombre_analista=analista_obj.nombre,
                                ticket_id=ticket_id,
                                asunto_ticket=ticket_data.asunto,
                                nombre_solicitante=ticket_data.nombre_creador,
                                categoria=cat_nombre,
                            )
                        else:
                            await EmailService.enviar_aviso_asignacion(
                                email_analista=analista_obj.correo,
                                nombre_analista=analista_obj.nombre,
                                ticket_id=ticket_id,
                                asunto_ticket=ticket_data.asunto,
                                nombre_solicitante=ticket_data.nombre_creador,
                                categoria=cat_nombre,
                            )
            except Exception as e_analista:
                print(f"WARNING: No se pudo notificar al analista: {e_analista}")

            # Notificación de Confirmación al Creador (Reactivada para dar feedback inmediato)
            try:
                # Asegurar que cat_nombre esté definido (si no se entró al bloque de analista)
                if 'cat_nombre' not in locals():
                    res_cat_c = await db.execute(
                        select(CategoriaTicket).where(CategoriaTicket.id == ticket_data.categoria_id)
                    )
                    cat_obj_c = res_cat_c.scalars().first()
                    cat_nombre = cat_obj_c.nombre if cat_obj_c else ticket_data.categoria_id

                if background_tasks:
                    background_tasks.add_task(
                        EmailService.enviar_confirmacion_ticket,
                        email=ticket_data.correo_creador,
                        nombre=ticket_data.nombre_creador,
                        ticket_id=ticket_id,
                        asunto_ticket=ticket_data.asunto,
                        descripcion=ticket_data.descripcion,
                        categoria=cat_nombre,
                    )
                else:
                    await EmailService.enviar_confirmacion_ticket(
                        email=ticket_data.correo_creador,
                        nombre=ticket_data.nombre_creador,
                        ticket_id=ticket_id,
                        asunto_ticket=ticket_data.asunto,
                        descripcion=ticket_data.descripcion,
                        categoria=cat_nombre,
                    )
            except Exception as mail_err:
                print(f"WARNING: No se pudo enviar el correo de confirmación: {mail_err}")

            return await cls.obtener_ticket_por_id(db, ticket_id)
        except Exception as e:
            await db.rollback()
            raise e

    @classmethod
    async def actualizar_ticket(
        cls, db: AsyncSession, ticket_id: str, ticket_in: TicketActualizar, background_tasks: Optional[BackgroundTasks] = None
    ) -> Ticket:
        """Actualiza un ticket existente (Async)"""
        result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
        db_ticket = result.scalars().first()
        if not db_ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")

        update_data = ticket_in.model_dump(exclude_unset=True)
        user_id = update_data.pop("usuario_id", None)
        user_name = update_data.pop("usuario_nombre", None)

        for field, value in update_data.items():
            old_value = getattr(db_ticket, field)
            if str(old_value) != str(value):
                if field in [
                    "estado",
                    "sub_estado",
                    "prioridad",
                    "asignado_a",
                    "resolucion",
                    "causa_novedad",
                ]:
                    await cls.registrar_historial(
                        db,
                        ticket_id,
                        f"Cambio de {field.capitalize()}",
                        f"De '{old_value or 'Ninguno'}' a '{value}'",
                        user_id,
                        user_name,
                    )
                setattr(db_ticket, field, value)

        if db_ticket.estado == "Pendiente":
            db_ticket.sub_estado = (
                "Asignado"
                if db_ticket.asignado_a and db_ticket.asignado_a.strip()
                else "Sin Asignar"
            )

        if db_ticket.sub_estado == "Resuelto" and not db_ticket.causa_novedad:
            raise HTTPException(
                status_code=400,
                detail="La 'Causa de la Novedad' es obligatoria para resolver el ticket.",
            )

        if "estado" in update_data or "sub_estado" in update_data:
            now = get_bogota_now()
            if db_ticket.estado == "Cerrado":
                db_ticket.fecha_cierre = db_ticket.fecha_cierre or now
                db_ticket.resuelto_en = db_ticket.resuelto_en or now
            elif db_ticket.estado == "Proceso":
                db_ticket.atendido_en = db_ticket.atendido_en or now
            else:
                db_ticket.fecha_cierre = db_ticket.resuelto_en = None

            # Notificación por correo de cambio de estado (Best-effort)
            if db_ticket.correo_creador:
                try:
                    if background_tasks:
                        background_tasks.add_task(
                            EmailService.enviar_notificacion_cambio_estado,
                            email_destinatario=db_ticket.correo_creador,
                            nombre_destinatario=db_ticket.nombre_creador or "Usuario",
                            ticket_id=ticket_id,
                            asunto_ticket=db_ticket.asunto,
                            nuevo_estado=db_ticket.estado,
                            comentario=db_ticket.resolucion if db_ticket.estado == "Resuelto" else None
                        )
                    else:
                        await EmailService.enviar_notificacion_cambio_estado(
                            email_destinatario=db_ticket.correo_creador,
                            nombre_destinatario=db_ticket.nombre_creador or "Usuario",
                            ticket_id=ticket_id,
                            asunto_ticket=db_ticket.asunto,
                            nuevo_estado=db_ticket.estado,
                            comentario=db_ticket.resolucion if db_ticket.estado == "Resuelto" else None
                        )
                except Exception as mail_err:
                    print(f"WARNING: No se pudo enviar notificación de cambio de estado: {mail_err}")

        await db.commit()
        
        # Notificación en tiempo real vía WebSocket
        try:
            await manager.broadcast_to_ticket(ticket_id, {
                "type": "ticket_updated",
                "data": {
                    "id": ticket_id,
                    "estado": db_ticket.estado,
                    "sub_estado": db_ticket.sub_estado,
                    "asignado_a": db_ticket.asignado_a
                }
            })
        except Exception:
            pass

        return await cls.obtener_ticket_por_id(db, ticket_id)

    @staticmethod
    async def obtener_ticket_por_id(
        db: AsyncSession, ticket_id: str
    ) -> Optional[Ticket]:
        """Obtiene un ticket por su ID con sus extensiones (Async)"""
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
            # Forzar boolean o False si es None (usuario no existe o no verificado)
            ticket.correo_verificado_creador = bool(verificado) if verificado is not None else False
            return ticket
        except Exception as e:
            import logging
            logging.error(f"ERROR en obtener_ticket_por_id ({ticket_id}): {str(e)}")
            # Fallback a búsqueda simple sin join si falla la extendida
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
                ticket = await cls.obtener_ticket_por_id(db, ticket_id)
                if ticket:
                    destinatario_email = None
                    nombre_destinatario = None
                    
                    # Caso A: El creador del ticket responde -> Notificar al analista asignado
                    # Usamos str() para asegurar comparación robusta entre UUIDs y strings
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

                    if destinatario_email:
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
                                    )
                                else:
                                    await EmailService.enviar_notificacion_chat(
                                        email_destinatario=destinatario_email,
                                        nombre_destinatario=nombre_destinatario,
                                        ticket_id=ticket_id,
                                        asunto_ticket=ticket.asunto,
                                        nombre_remitente=nuevo_comentario.nombre_usuario or "Soporte",
                                        mensaje=nuevo_comentario.comentario,
                                    )
                                global_cache.set(cache_key, True, ttl=1800)
                            except Exception as e:
                                print(f"WARNING: No se pudo enviar notificación de chat: {e}")
                
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


    @staticmethod
    async def listar_tickets_por_usuario(
        db: AsyncSession, usuario_id: str
    ) -> List[Ticket]:
        """Lista tickets creados por un usuario (Async)"""
        return await ServicioTicket.listar_tickets(db, creador_id=usuario_id, limit=500)
