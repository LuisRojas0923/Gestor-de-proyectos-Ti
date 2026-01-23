"""
Servicio de Tickets - Backend V2 (Async + SQLModel)
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sa_func
from sqlmodel import select
from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.ticket.ticket import (
    Ticket,
    ComentarioTicket,
    CategoriaTicket,
    SolicitudDesarrollo,
    HistorialTicket,
    AdjuntoTicket,
    TicketCrear,
    TicketActualizar,
    AdjuntoCrear
)
from app.models.auth.usuario import Usuario


class ServicioTicket:
    """Servicio principal para gestion de tickets (Async)"""
    
    @staticmethod
    async def obtener_analista_menos_cargado(db: AsyncSession) -> Optional[str]:
        """Busca al analista o admin con menos tickets activos asignados (Async)"""
        try:
            # 1. Obtener todos los analistas/admins activos
            result = await db.execute(
                select(Usuario).where(
                    Usuario.rol.in_(["analyst", "admin"]),
                    Usuario.esta_activo == True
                )
            )
            analistas = result.scalars().all()
            
            if not analistas:
                return None
                
            # 2. Contar tickets activos por analista
            conteo_carga = []
            for a in analistas:
                result_count = await db.execute(
                    select(sa_func.count(Ticket.id)).where(
                        Ticket.asignado_a == a.nombre,
                        Ticket.estado.in_(["Abierto", "Asignado", "En Proceso", "Pendiente Info", "Escalado"])
                    )
                )
                carga = result_count.scalar() or 0
                conteo_carga.append((a.nombre, carga))
                
            # 3. Retornar el nombre del que tenga menos carga
            conteo_carga.sort(key=lambda x: x[1])
            return conteo_carga[0][0]
        except Exception:
            return None

    @staticmethod
    async def registrar_historial(db: AsyncSession, ticket_id: str, accion: str, detalle: str):
        """Helper para registrar eventos en el historial del ticket (Async)"""
        log = HistorialTicket(
            ticket_id=ticket_id,
            accion=accion,
            detalle=detalle
        )
        db.add(log)

    @staticmethod
    async def obtener_estadisticas_resumen(db: AsyncSession) -> Dict[str, Any]:
        """Obtiene estadisticas resumidas de tickets (Async)"""
        total = (await db.execute(select(sa_func.count(Ticket.id)))).scalar() or 0
        abiertos = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "Abierto"))).scalar() or 0
        en_proceso = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "En Proceso"))).scalar() or 0
        pendientes_info = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "Pendiente Info"))).scalar() or 0
        escalados = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "Escalado"))).scalar() or 0
        cerrados = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "Cerrado"))).scalar() or 0
        resueltos = (await db.execute(select(sa_func.count(Ticket.id)).where(Ticket.estado == "Resuelto"))).scalar() or 0
        
        return {
            "total": total,
            "nuevos": abiertos,
            "en_proceso": en_proceso,
            "pendientes": abiertos + en_proceso + pendientes_info + escalados,
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
            nuevo_ticket = Ticket(
                id=ticket_data.id,
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
                estado="Abierto",
                datos_extra=ticket_data.datos_extra
            )
            
            analista = await cls.obtener_analista_menos_cargado(db)
            if analista:
                nuevo_ticket.asignado_a = analista
            
            db.add(nuevo_ticket)
            await cls.registrar_historial(db, ticket_data.id, "Creacion", f"Ticket creado por {ticket_data.nombre_creador}")
            
            if analista:
                await cls.registrar_historial(db, ticket_data.id, "Asignacion Automatica", f"Asignado a {analista} por balanceo de carga")
            
            if ticket_data.que_necesita or ticket_data.porque:
                solicitud = SolicitudDesarrollo(
                    ticket_id=ticket_data.id,
                    que_necesita=ticket_data.que_necesita,
                    porque=ticket_data.porque,
                    paraque=ticket_data.paraque,
                    justificacion_ia=ticket_data.justificacion_ia
                )
                db.add(solicitud)
                
            await db.commit()
            await db.refresh(nuevo_ticket)
            return nuevo_ticket
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
        for field, value in update_data.items():
            old_value = getattr(db_ticket, field)
            if str(old_value) != str(value):
                if field in ["estado", "prioridad", "asignado_a", "resolucion"]:
                    await cls.registrar_historial(db, ticket_id, f"Cambio de {field.capitalize()}", f"De '{old_value or 'Ninguno'}' a '{value}'")
                setattr(db_ticket, field, value)
        
        # Auto-dates for resolution
        if "estado" in update_data:
            if update_data["estado"] in ["Resuelto", "Cerrado"]:
                now = datetime.now(timezone.utc)
                if not db_ticket.fecha_cierre: 
                    db_ticket.fecha_cierre = now
                if not db_ticket.resuelto_en: 
                    db_ticket.resuelto_en = now
            else:
                db_ticket.fecha_cierre = None
                db_ticket.resuelto_en = None
                
        await db.commit()
        await db.refresh(db_ticket)
        return db_ticket

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
        """Obtiene un ticket por su ID (Async)"""
        result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
        return result.scalars().first()

    @staticmethod
    async def listar_tickets(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Ticket]:
        """Lista todos los tickets con paginacion (Async)"""
        result = await db.execute(select(Ticket).offset(skip).limit(limit))
        return result.scalars().all()

    @staticmethod
    async def listar_tickets_por_usuario(db: AsyncSession, usuario_id: str) -> List[Ticket]:
        """Lista tickets creados por un usuario (Async)"""
        result = await db.execute(select(Ticket).where(Ticket.creador_id == usuario_id))
        return result.scalars().all()

    @staticmethod
    async def listar_categorias(db: AsyncSession) -> List[CategoriaTicket]:
        """Lista todas las categorias de tickets (Async)"""
        result = await db.execute(select(CategoriaTicket))
        return result.scalars().all()
