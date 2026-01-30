"""
Servicio de Tickets - Backend V2 (Async + SQLModel)
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sa_func, text
from sqlalchemy.orm import joinedload
from sqlmodel import select
from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.ticket.ticket import (
    Ticket,
    ComentarioTicket,
    CategoriaTicket,
    SolicitudDesarrollo,
    ControlCambios,
    SolicitudActivo,
    HistorialTicket,
    AdjuntoTicket,
    TicketCrear,
    TicketActualizar,
    AdjuntoCrear
)
from app.models.auth.usuario import Usuario
from app.utils_date import get_bogota_now


class ServicioTicket:
    """Servicio principal para gestion de tickets (Async)"""
    
    @staticmethod
    async def obtener_analista_menos_cargado(db: AsyncSession, categoria_id: str = None, area_solicitante: str = None) -> Optional[str]:
        """Busca al analista o admin con menos tickets activos asignados, considerando especialidades y áreas (Async)"""
        try:
            import json
            # 1. Obtener todos los analistas/admins activos
            result = await db.execute(
                select(Usuario).where(
                    Usuario.rol.in_(["analyst", "admin"]),
                    Usuario.esta_activo == True
                )
            )
            todos_analistas = result.scalars().all()
            
            if not todos_analistas:
                return None
            
            # 2. Filtrar por especialidad y área
            candidatos = []
            for a in todos_analistas:
                # Si es Admin, es candidato para todo
                if a.rol == "admin":
                    candidatos.append(a)
                    continue
                
                # Parsear JSON de especialidades y áreas
                try:
                    especialidades = json.loads(a.especialidades or "[]")
                    areas = json.loads(a.areas_asignadas or "[]")
                except:
                    especialidades = []
                    areas = []

                # Lógica de ruteo:
                # Si se especifica categoria_id, el analista debe tenerla en sus especialidades (o estar vacía para 'all')
                cumple_especialidad = not categoria_id or (categoria_id in especialidades)
                
                # Si es soporte de mejoramiento, validamos el área
                cumple_area = True
                if categoria_id == "soporte_mejora" and area_solicitante:
                    cumple_area = not areas or (area_solicitante in areas)
                
                if cumple_especialidad and cumple_area:
                    candidatos.append(a)

            # Si no hay candidatos específicos, usamos todos los analistas como fallback
            if not candidatos:
                candidatos = todos_analistas
                
            # 3. Contar tickets activos por candidato
            conteo_carga = []
            for a in candidatos:
                result_count = await db.execute(
                    select(sa_func.count(Ticket.id)).where(
                        Ticket.asignado_a == a.nombre,
                        Ticket.estado.in_(["Abierto", "Asignado", "En Proceso", "Pendiente Info", "Escalado"])
                    )
                )
                carga = result_count.scalar() or 0
                conteo_carga.append((a.nombre, carga))
                
            # 4. Retornar el nombre del que tenga menos carga
            conteo_carga.sort(key=lambda x: x[1])
            return conteo_carga[0][0]
        except Exception as e:
            print(f"Error en ruteo: {e}")
            return None

    @staticmethod
    async def registrar_historial(db: AsyncSession, ticket_id: str, accion: str, detalle: str, usuario_id: str = None, nombre_usuario: str = None):
        """Helper para registrar eventos en el historial del ticket (Async)"""
        log = HistorialTicket(
            ticket_id=ticket_id,
            accion=accion,
            detalle=detalle,
            usuario_id=usuario_id,
            nombre_usuario=nombre_usuario
        )
        db.add(log)

    @staticmethod
    async def obtener_estadisticas_resumen(db: AsyncSession) -> Dict[str, Any]:
        """Obtiene estadisticas resumidas de tickets (Async)"""
        total = (await db.execute(select(sa_func.count(Ticket.id)))).scalar() or 0
        # Consideramos Abierto y Asignado como "nuevos"
        nuevos = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado.in_(["Abierto", "Asignado"])))).scalar() or 0
        en_proceso = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "En Proceso"))).scalar() or 0
        pendientes_info = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "Pendiente Info"))).scalar() or 0
        escalados = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "Escalado"))).scalar() or 0
        cerrados = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "Cerrado"))).scalar() or 0
        resueltos = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "Resuelto"))).scalar() or 0
        
        return {
            "total": total,
            "nuevos": nuevos,
            "en_proceso": en_proceso,
            "pendientes": nuevos + en_proceso + pendientes_info + escalados,
            "cerrados": cerrados + resueltos,
            "escalados": escalados,
            "completion_rate": round(((cerrados + resueltos) / total * 100) if total > 0 else 0, 1),
            "total_tickets": total
        }

    @staticmethod
    async def obtener_estadisticas_avanzadas(db: AsyncSession) -> Dict[str, Any]:
        """Obtiene estadisticas avanzadas de tickets (Async)"""
        result = await db.execute(
            select(Ticket).where(
                Ticket.estado.in_(["Resuelto", "Cerrado"]),
                Ticket.resuelto_en != None
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
            select(Ticket.prioridad, sa_func.count(Ticket.id)).group_by(Ticket.prioridad)
        )
        prioridades = prioridades_result.all()
        
        return {
            "avg_resolution_time": avg_resolution_time,
            "sla_compliance": sla_percentage,
            "total_resolved": len(tickets_cerrados),
            "priority_distribution": {p[0]: p[1] for p in prioridades},
            "sla_limit_hours": sla_limit_hours
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
                estado="Asignado",
                datos_extra=ticket_data.datos_extra,
                areas_impactadas=ticket_data.areas_impactadas
            )
            
            analista = await cls.obtener_analista_menos_cargado(
                db, 
                categoria_id=ticket_data.categoria_id,
                area_solicitante=ticket_data.area_creador
            )
            if analista:
                nuevo_ticket.asignado_a = analista
            
            db.add(nuevo_ticket)
            await cls.registrar_historial(db, ticket_id, "Creacion", f"Ticket creado por {ticket_data.nombre_creador}")
            
            if analista:
                await cls.registrar_historial(db, ticket_id, "Asignacion Automatica", f"Asignado a {analista} por balanceo de carga")
            
            if ticket_data.que_necesita or ticket_data.porque:
                solicitud = SolicitudDesarrollo(
                    ticket_id=ticket_id,
                    que_necesita=ticket_data.que_necesita,
                    porque=ticket_data.porque,
                    paraque=ticket_data.paraque,
                    justificacion_ia=ticket_data.justificacion_ia
                )
                db.add(solicitud)
                
            if ticket_data.categoria_id == "control_cambios" or (ticket_data.tipo_objeto and ticket_data.accion_requerida):
                control = ControlCambios(
                    ticket_id=ticket_id,
                    desarrollo_id=ticket_data.desarrollo_id,
                    modulo_solid_id=ticket_data.modulo_solid_id,
                    componente_solid_id=ticket_data.componente_solid_id,
                    tipo_objeto=ticket_data.tipo_objeto or "No especificado",
                    accion_requerida=ticket_data.accion_requerida or "No especificada",
                    impacto_operativo=ticket_data.impacto_operativo or "Bajo",
                    justificacion=ticket_data.justificacion_cambio or "",
                    descripcion_cambio=ticket_data.descripcion_cambio or ""
                )
                db.add(control)
                
            if ticket_data.item_solicitado or ticket_data.especificaciones:
                activo = SolicitudActivo(
                    ticket_id=ticket_id,
                    item_solicitado=ticket_data.item_solicitado or "PRODUCTO/SERVICIO",
                    especificaciones=ticket_data.especificaciones,
                    cantidad=ticket_data.cantidad or 1
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
                    joinedload(Ticket.control_cambios)
                )
            )
            return result.scalars().first()
        except Exception as e:
            await db.rollback()
            raise e

    @classmethod
    async def actualizar_ticket(cls, db: AsyncSession, ticket_id: str, ticket_in: TicketActualizar) -> Ticket:
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
                if field in ["estado", "prioridad", "asignado_a", "resolucion", "causa_novedad"]:
                    await cls.registrar_historial(db, ticket_id, f"Cambio de {field.capitalize()}", f"De '{old_value or 'Ninguno'}' a '{value}'", user_id, user_name)
                setattr(db_ticket, field, value)
        
        # Validación de Causa Obligatoria para estado Resuelto
        if db_ticket.estado == "Resuelto" and not db_ticket.causa_novedad:
            raise HTTPException(status_code=400, detail="La 'Causa de la Novedad' es obligatoria para resolver el ticket.")

        # Auto-dates for resolution
        if "estado" in update_data:
            new_status = update_data["estado"]
            now = get_bogota_now()
            
            if new_status in ["Resuelto", "Cerrado"]:
                if not db_ticket.fecha_cierre: 
                    db_ticket.fecha_cierre = now
                if not db_ticket.resuelto_en: 
                    db_ticket.resuelto_en = now
            elif new_status == "En Proceso":
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
                joinedload(Ticket.control_cambios)
            )
        )
        return result.scalars().first()

    @classmethod
    async def subir_adjunto(cls, db: AsyncSession, ticket_id: str, adjunto: AdjuntoCrear) -> AdjuntoTicket:
        """Sube un archivo adjunto a un ticket (Async)"""
        nuevo_adjunto = AdjuntoTicket(
            ticket_id=ticket_id,
            nombre_archivo=adjunto.nombre_archivo,
            contenido_base64=adjunto.contenido_base64,
            tipo_mime=adjunto.tipo_mime
        )
        db.add(nuevo_adjunto)
        await cls.registrar_historial(db, ticket_id, "Archivo Adjunto", f"Se adjunto el archivo: {adjunto.nombre_archivo}")
        await db.commit()
        await db.refresh(nuevo_adjunto)
        return nuevo_adjunto

    @staticmethod
    async def obtener_ticket_por_id(db: AsyncSession, ticket_id: str) -> Optional[Ticket]:
        """Obtiene un ticket por su ID con sus extensiones (Async)"""
        result = await db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                joinedload(Ticket.solicitud_activo),
                joinedload(Ticket.solicitud_desarrollo),
                joinedload(Ticket.control_cambios),
                joinedload(Ticket.adjuntos)
            )
        )
        return result.scalars().first()

    async def listar_tickets(
        db: AsyncSession, 
        skip: int = 0, 
        limit: int = 100,
        creador_id: Optional[str] = None,
        estado: Optional[str] = None,
        asignado_a: Optional[str] = None
    ) -> List[Ticket]:
        """Lista tickets con paginacion, extensiones y filtros (Async)"""
        query = select(Ticket).options(
            joinedload(Ticket.solicitud_activo),
            joinedload(Ticket.solicitud_desarrollo),
            joinedload(Ticket.control_cambios)
        )
        if creador_id:
            query = query.where(Ticket.creador_id == creador_id)
        if estado:
            query = query.where(Ticket.estado == estado)
        if asignado_a:
            query = query.where(Ticket.asignado_a == asignado_a)
            
        query = query.order_by(Ticket.creado_en.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def listar_tickets_por_usuario(db: AsyncSession, usuario_id: str) -> List[Ticket]:
        """Lista tickets creados por un usuario con sus extensiones (Async)"""
        result = await db.execute(
            select(Ticket)
            .where(Ticket.creador_id == usuario_id)
            .options(
                joinedload(Ticket.solicitud_activo),
                joinedload(Ticket.solicitud_desarrollo),
                joinedload(Ticket.control_cambios)
            )
        )
        return result.scalars().all()

    @staticmethod
    async def listar_categorias(db: AsyncSession) -> List[CategoriaTicket]:
        """Lista todas las categorias de tickets (Async)"""
        result = await db.execute(select(CategoriaTicket))
        return result.scalars().all()
