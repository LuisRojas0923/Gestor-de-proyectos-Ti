"""
Servicio de Tickets - Backend V2 (Facade)
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, or_
from sqlalchemy.orm import joinedload
from sqlmodel import select
from fastapi import HTTPException
import json

from app.models.ticket.ticket import (
    Ticket,
    SolicitudDesarrollo,
    ControlCambios,
    SolicitudActivo,
    TicketCrear,
    TicketActualizar,
)
from app.models.auth.usuario import Usuario
from app.utils_date import get_bogota_now

# Importación de servicios especializados
from .stats_service import StatService
from .category_service import CategoryService
from .attachment_service import AttachmentService
from .ticket_utils import TicketUtils


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

    @classmethod
    async def crear_ticket(cls, db: AsyncSession, ticket_data: TicketCrear) -> Ticket:
        """Crea un nuevo ticket (Async)"""
        try:
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
            return await cls.obtener_ticket_por_id(db, ticket_id)
        except Exception as e:
            await db.rollback()
            raise e

    @classmethod
    async def actualizar_ticket(
        cls, db: AsyncSession, ticket_id: str, ticket_in: TicketActualizar
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

        await db.commit()
        return await cls.obtener_ticket_por_id(db, ticket_id)

    @staticmethod
    async def obtener_ticket_por_id(
        db: AsyncSession, ticket_id: str
    ) -> Optional[Ticket]:
        """Obtiene un ticket por su ID con sus extensiones (Async)"""
        result = await db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                joinedload(Ticket.solicitud_activo),
                joinedload(Ticket.solicitud_desarrollo),
                joinedload(Ticket.control_cambios),
                joinedload(Ticket.adjuntos),
            )
        )
        return result.scalars().first()

    @staticmethod
    async def listar_tickets(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        creador_id: Optional[str] = None,
        estado: Optional[str] = None,
        asignado_a: Optional[str] = None,
        search: Optional[str] = None,
        sub_estado: Optional[str] = None,
        categoria_id: Optional[str] = None,
        usuario_peticion: Optional[Usuario] = None,
    ) -> List[Ticket]:
        """Lista tickets con paginacion, extensiones y filtros (Async)"""
        query = select(Ticket).options(
            joinedload(Ticket.solicitud_activo),
            joinedload(Ticket.solicitud_desarrollo),
            joinedload(Ticket.control_cambios),
        )

        if creador_id:
            query = query.where(Ticket.creador_id == creador_id)
        if estado:
            query = query.where(Ticket.estado == estado)
        if sub_estado:
            query = query.where(Ticket.sub_estado == sub_estado)
        if asignado_a:
            query = query.where(Ticket.asignado_a == asignado_a)
        if categoria_id:
            if categoria_id == "grupo_ti":
                categorias_ti = [
                    "soporte_hardware",
                    "soporte_software",
                    "soporte_impresoras",
                    "perifericos",
                    "compra_licencias",
                ]
                query = query.where(Ticket.categoria_id.in_(categorias_ti))
            elif categoria_id == "grupo_mejoramiento":
                categorias_mejora = [
                    "soporte_mejora",
                    "nuevos_desarrollos_solid",
                    "nuevos_desarrollos_mejora",
                ]
                query = query.where(Ticket.categoria_id.in_(categorias_mejora))
            else:
                query = query.where(Ticket.categoria_id == categoria_id)

        if usuario_peticion:
            if usuario_peticion.rol == "admin_sistemas":
                specs = json.loads(usuario_peticion.especialidades or "[]")
                areas = json.loads(usuario_peticion.areas_asignadas or "[]")
                filtros_visibilidad = [
                    Ticket.asignado_a == usuario_peticion.nombre,
                    Ticket.creador_id == usuario_peticion.id,
                ]
                if specs:
                    filtros_visibilidad.append(Ticket.categoria_id.in_(specs))
                if areas:
                    filtros_visibilidad.append(Ticket.area_creador.in_(areas))
                query = query.where(or_(*filtros_visibilidad))
            elif usuario_peticion.rol == "analyst" and not creador_id:
                query = query.where(
                    or_(
                        Ticket.asignado_a == usuario_peticion.nombre,
                        Ticket.creador_id == usuario_peticion.id,
                    )
                )

        if search:
            p = f"%{search}%"
            query = query.where(
                or_(
                    Ticket.id.ilike(p),
                    Ticket.asunto.ilike(p),
                    Ticket.nombre_creador.ilike(p),
                    Ticket.area_creador.ilike(p),
                )
            )

        query = query.order_by(Ticket.creado_en.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def listar_tickets_por_usuario(
        db: AsyncSession, usuario_id: str
    ) -> List[Ticket]:
        """Lista tickets creados por un usuario (Async)"""
        result = await db.execute(
            select(Ticket)
            .where(Ticket.creador_id == usuario_id)
            .options(
                joinedload(Ticket.solicitud_activo),
                joinedload(Ticket.solicitud_desarrollo),
                joinedload(Ticket.control_cambios),
            )
        )
        return result.scalars().all()
