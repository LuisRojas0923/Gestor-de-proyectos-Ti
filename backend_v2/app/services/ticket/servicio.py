"""
Servicio de Tickets - Backend V2 (Async + SQLModel)
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sa_func, text, or_
from sqlalchemy.orm import joinedload
from sqlmodel import select
from fastapi import HTTPException
import json

from app.models.ticket.ticket import (
    Ticket,
    CategoriaTicket,
    SolicitudDesarrollo,
    ControlCambios,
    SolicitudActivo,
    HistorialTicket,
    AdjuntoTicket,
    TicketCrear,
    TicketActualizar,
    AdjuntoCrear,
)
from app.models.auth.usuario import Usuario
from app.utils_date import get_bogota_now


class ServicioTicket:
    """Servicio principal para gestion de tickets (Async)"""

    @staticmethod
    async def obtener_analista_menos_cargado(
        db: AsyncSession, categoria_id: str = None, area_solicitante: str = None
    ) -> Optional[str]:
        """Busca al analista con menos tickets activos usando cascada de prioridad (Async)

        Cascada:
        1. analyst/admin_sistemas con especialidad + área (solo mejoramiento)
        2. analyst/admin_sistemas con especialidad (sin filtro de área)
        3. admin como último recurso
        4. None → ticket queda "Sin Asignar"
        """
        try:
            import json

            # 1. Obtener todos los usuarios activos con roles válidos
            result = await db.execute(
                select(Usuario).where(
                    Usuario.rol.in_(["analyst", "admin_sistemas", "admin"]),
                    Usuario.esta_activo,
                )
            )
            todos = result.scalars().all()

            if not todos:
                return None

            # 2. Separar por prioridad de rol
            analistas = [u for u in todos if u.rol in ("analyst", "admin_sistemas")]
            admins = [u for u in todos if u.rol == "admin"]

            # 3. Filtrar analistas por especialidad
            con_especialidad = []
            for a in analistas:
                try:
                    especialidades = json.loads(a.especialidades or "[]")
                except Exception:
                    especialidades = []

                # Solo considerar si tiene especialidades configuradas
                if not especialidades:
                    continue

                if categoria_id and categoria_id in especialidades:
                    con_especialidad.append(a)

            # 4. Aplicar filtro de área (solo para soporte_mejora)
            candidatos = con_especialidad
            if (
                categoria_id == "soporte_mejora"
                and area_solicitante
                and con_especialidad
            ):
                # Intentar match por área
                con_area = []
                for a in con_especialidad:
                    try:
                        areas = json.loads(a.areas_asignadas or "[]")
                    except Exception:
                        areas = []

                    if areas and area_solicitante in areas:
                        con_area.append(a)

                # Si hay match de área, usarlos; si no, relajar a todos los de mejoramiento
                if con_area:
                    candidatos = con_area
                else:
                    candidatos = con_especialidad

            # 5. Fallback a admin si no hay candidatos
            if not candidatos:
                candidatos = admins

            # 6. Sin candidatos → Sin Asignar
            if not candidatos:
                return None

            # 7. Contar tickets activos y retornar el de menor carga
            conteo_carga = []
            for a in candidatos:
                result_count = await db.execute(
                    select(sa_func.count(Ticket.id)).where(
                        Ticket.asignado_a == a.nombre,
                        Ticket.estado.in_(["Pendiente", "Proceso"]),
                    )
                )
                carga = result_count.scalar() or 0
                conteo_carga.append((a.nombre, carga))

            conteo_carga.sort(key=lambda x: x[1])
            return conteo_carga[0][0]
        except Exception as e:
            print(f"Error en ruteo de asignación: {e}")
            return None

    @staticmethod
    async def registrar_historial(
        db: AsyncSession,
        ticket_id: str,
        accion: str,
        detalle: str,
        usuario_id: str = None,
        nombre_usuario: str = None,
    ):
        """Helper para registrar eventos en el historial del ticket (Async)"""
        log = HistorialTicket(
            ticket_id=ticket_id,
            accion=accion,
            detalle=detalle,
            usuario_id=usuario_id,
            nombre_usuario=nombre_usuario,
        )
        db.add(log)

    @staticmethod
    async def obtener_estadisticas_resumen(db: AsyncSession) -> Dict[str, Any]:
        """Obtiene estadisticas resumidas de tickets (Async)"""
        total = (await db.execute(select(sa_func.count(Ticket.id)))).scalar() or 0
        # Pendiente = tickets nuevos/asignados
        pendiente = (
            await db.execute(
                select(sa_func.count(Ticket.id)).where(Ticket.estado == "Pendiente")
            )
        ).scalar() or 0
        en_proceso = (
            await db.execute(
                select(sa_func.count(Ticket.id)).where(Ticket.estado == "Proceso")
            )
        ).scalar() or 0
        cerrados = (
            await db.execute(
                select(sa_func.count(Ticket.id)).where(Ticket.estado == "Cerrado")
            )
        ).scalar() or 0
        escalados = (
            await db.execute(
                select(sa_func.count(Ticket.id)).where(
                    Ticket.estado == "Cerrado", Ticket.sub_estado == "Escalado"
                )
            )
        ).scalar() or 0

        return {
            "total": total,
            "nuevos": pendiente,
            "en_proceso": en_proceso,
            "pendientes": pendiente + en_proceso,
            "cerrados": cerrados,
            "escalados": escalados,
            "completion_rate": round((cerrados / total * 100) if total > 0 else 0, 1),
            "total_tickets": total,
        }

    @staticmethod
    async def obtener_estadisticas_avanzadas(db: AsyncSession) -> Dict[str, Any]:
        """Obtiene estadisticas avanzadas de tickets (Async)"""
        result = await db.execute(
            select(Ticket).where(
                Ticket.estado == "Cerrado",
                Ticket.sub_estado == "Resuelto",
            )
        )
        tickets_cerrados = result.scalars().all()

        tiempos = []
        for t in tickets_cerrados:
            if t.resuelto_en and t.creado_en:
                tiempos.append((t.resuelto_en - t.creado_en).total_seconds() / 3600)

        avg_resolution_time = round(sum(tiempos) / len(tiempos), 1) if tiempos else 0

        sla_limit_hours = 48
        dentro_sla = sum(1 for t in tiempos if t <= sla_limit_hours)
        sla_percentage = round((dentro_sla / len(tiempos) * 100), 1) if tiempos else 100

        prioridades_result = await db.execute(
            select(Ticket.prioridad, sa_func.count(Ticket.id)).group_by(
                Ticket.prioridad
            )
        )
        prioridades = prioridades_result.all()

        return {
            "avg_resolution_time": avg_resolution_time,
            "sla_compliance": sla_percentage,
            "total_resolved": len(tickets_cerrados),
            "priority_distribution": {p[0]: p[1] for p in prioridades},
            "sla_limit_hours": sla_limit_hours,
        }

    @classmethod
    async def crear_ticket(cls, db: AsyncSession, ticket_data: TicketCrear) -> Ticket:
        """Crea un nuevo ticket (Async)"""
        try:
            # Generar ID secuencial si no se proporciona (o siempre para asegurar orden)
            # Formato: TKT-0001, TKT-0002...
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

            if ticket_data.que_necesita or ticket_data.porque:
                solicitud = SolicitudDesarrollo(
                    ticket_id=ticket_id,
                    que_necesita=ticket_data.que_necesita,
                    porque=ticket_data.porque,
                    paraque=ticket_data.paraque,
                    justificacion_ia=ticket_data.justificacion_ia,
                )
                db.add(solicitud)

            if ticket_data.categoria_id == "control_cambios" or (
                ticket_data.tipo_objeto and ticket_data.accion_requerida
            ):
                control = ControlCambios(
                    ticket_id=ticket_id,
                    desarrollo_id=ticket_data.desarrollo_id,
                    modulo_solid_id=ticket_data.modulo_solid_id,
                    componente_solid_id=ticket_data.componente_solid_id,
                    tipo_objeto=ticket_data.tipo_objeto or "No especificado",
                    accion_requerida=ticket_data.accion_requerida or "No especificada",
                    impacto_operativo=ticket_data.impacto_operativo or "Bajo",
                    justificacion=ticket_data.justificacion_cambio or "",
                    descripcion_cambio=ticket_data.descripcion_cambio or "",
                )
                db.add(control)

            if ticket_data.item_solicitado or ticket_data.especificaciones:
                activo = SolicitudActivo(
                    ticket_id=ticket_id,
                    item_solicitado=ticket_data.item_solicitado or "PRODUCTO/SERVICIO",
                    especificaciones=ticket_data.especificaciones,
                    cantidad=ticket_data.cantidad or 1,
                )
                db.add(activo)

            await db.commit()

            # Re-obtener con extensiones para evitar errores de lazy loading en la respuesta
            result = await db.execute(
                select(Ticket)
                .where(Ticket.id == ticket_id)
                .options(
                    joinedload(Ticket.solicitud_activo),
                    joinedload(Ticket.solicitud_desarrollo),
                    joinedload(Ticket.control_cambios),
                )
            )
            return result.scalars().first()
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

        # Track history
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

        # Inteligencia de sub-estado para Pendiente
        if db_ticket.estado == "Pendiente":
            if db_ticket.asignado_a and db_ticket.asignado_a.strip():
                db_ticket.sub_estado = "Asignado"
            else:
                db_ticket.sub_estado = "Sin Asignar"

        # Validación de Causa Obligatoria para sub_estado Resuelto
        if db_ticket.sub_estado == "Resuelto" and not db_ticket.causa_novedad:
            raise HTTPException(
                status_code=400,
                detail="La 'Causa de la Novedad' es obligatoria para resolver el ticket.",
            )

        # Auto-dates for resolution
        if "estado" in update_data or "sub_estado" in update_data:
            now = get_bogota_now()

            if db_ticket.estado == "Cerrado":
                if not db_ticket.fecha_cierre:
                    db_ticket.fecha_cierre = now
                if not db_ticket.resuelto_en:
                    db_ticket.resuelto_en = now
            elif db_ticket.estado == "Proceso":
                # Capturar fecha de atención inicial si es la primera vez
                if not db_ticket.atendido_en:
                    db_ticket.atendido_en = now
            else:
                db_ticket.fecha_cierre = None
                db_ticket.resuelto_en = None

        await db.commit()

        # Re-obtener con extensiones para evitar errores de lazy loading
        result = await db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                joinedload(Ticket.solicitud_activo),
                joinedload(Ticket.solicitud_desarrollo),
                joinedload(Ticket.control_cambios),
            )
        )
        return result.scalars().first()

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
        await cls.registrar_historial(
            db,
            ticket_id,
            "Archivo Adjunto",
            f"Se adjunto el archivo: {adjunto.nombre_archivo}",
        )
        await db.commit()
        await db.refresh(nuevo_adjunto)
        return nuevo_adjunto

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

    async def listar_tickets(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        creador_id: Optional[str] = None,
        estado: Optional[str] = None,
        asignado_a: Optional[str] = None,
        search: Optional[str] = None,
        sub_estado: Optional[str] = None,
        usuario_peticion: Optional[Usuario] = None,
    ) -> List[Ticket]:
        """Lista tickets con paginacion, extensiones y filtros (Async)"""
        query = select(Ticket).options(
            joinedload(Ticket.solicitud_activo),
            joinedload(Ticket.solicitud_desarrollo),
            joinedload(Ticket.control_cambios),
        )

        # Filtros básicos
        if creador_id:
            query = query.where(Ticket.creador_id == creador_id)
        if estado:
            query = query.where(Ticket.estado == estado)
        if sub_estado:
            query = query.where(Ticket.sub_estado == sub_estado)
        if asignado_a:
            query = query.where(Ticket.asignado_a == asignado_a)

        # Restricción por Rol y Permisos Granulares (Visibilidad Dinámica)
        if usuario_peticion:
            if usuario_peticion.rol == "admin":
                # Admin ve absolutamente todo
                pass
            elif usuario_peticion.rol == "admin_sistemas":
                # Admin Sistemas ve: sus especialidades, sus áreas, sus asignados y sus creados
                try:
                    specs = json.loads(usuario_peticion.especialidades or "[]")
                    areas = json.loads(usuario_peticion.areas_asignadas or "[]")
                except Exception:
                    specs = []
                    areas = []

                filtros_visibilidad = []
                if specs:
                    filtros_visibilidad.append(Ticket.categoria_id.in_(specs))
                if areas:
                    filtros_visibilidad.append(Ticket.area_creador.in_(areas))

                # Inclusión por asignación o creación personal
                filtros_visibilidad.append(Ticket.asignado_a == usuario_peticion.nombre)
                filtros_visibilidad.append(Ticket.creador_id == usuario_peticion.id)

                if filtros_visibilidad:
                    query = query.where(or_(*filtros_visibilidad))

            elif usuario_peticion.rol == "analyst":
                # Analista estándar solo ve lo que tiene asignado o lo que el mismo creó
                # A menos que se esté filtrando específicamente por creador_id (mis tickets)
                if not creador_id:
                    query = query.where(
                        or_(
                            Ticket.asignado_a == usuario_peticion.nombre,
                            Ticket.creador_id == usuario_peticion.id,
                        )
                    )

        # Búsqueda global (Servidor)
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Ticket.id.ilike(search_pattern),
                    Ticket.asunto.ilike(search_pattern),
                    Ticket.nombre_creador.ilike(search_pattern),
                    Ticket.area_creador.ilike(search_pattern),
                )
            )

        query = query.order_by(Ticket.creado_en.desc()).offset(skip).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def listar_tickets_por_usuario(
        db: AsyncSession, usuario_id: str
    ) -> List[Ticket]:
        """Lista tickets creados por un usuario con sus extensiones (Async)"""
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

    @staticmethod
    async def listar_categorias(db: AsyncSession) -> List[CategoriaTicket]:
        """Lista todas las categorias de tickets (Async)"""
        result = await db.execute(select(CategoriaTicket))
        return result.scalars().all()
