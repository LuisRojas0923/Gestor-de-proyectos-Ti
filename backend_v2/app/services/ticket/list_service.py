import json
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, text
from sqlalchemy.orm import joinedload

from app.models.ticket import Ticket
from app.models.auth.usuario import Usuario

class TicketListService:
    """Servicio especializado en el listado y filtrado de tickets"""

    @staticmethod
    async def listar_tickets(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        estado: Optional[str] = None,
        sub_estado: Optional[str] = None,
        creador_id: Optional[str] = None,
        asignado_a: Optional[str] = None,
        categoria_id: Optional[str] = None,
        search: Optional[str] = None,
        usuario_peticion: Optional[Usuario] = None,
    ) -> List[Ticket]:
        """Lista tickets con filtros avanzados (Async)"""
        # Consulta base uniendo con Usuario para verificar correo
        query = (
            select(Ticket, Usuario.correo_verificado)
            .outerjoin(Usuario, Ticket.creador_id == Usuario.id)
            .options(
                joinedload(Ticket.adjuntos),
                joinedload(Ticket.historial),
                joinedload(Ticket.comentarios),
                joinedload(Ticket.solicitud_desarrollo),
                joinedload(Ticket.control_cambios),
            )
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
                categorias_ti = ["soporte_hardware", "soporte_software", "soporte_impresoras", "perifericos", "compra_licencias"]
                query = query.where(Ticket.categoria_id.in_(categorias_ti))
            elif categoria_id == "grupo_mejoramiento":
                categorias_mejora = ["soporte_mejora", "nuevos_desarrollos_solid", "nuevos_desarrollos_mejora"]
                query = query.where(Ticket.categoria_id.in_(categorias_mejora))
            else:
                query = query.where(Ticket.categoria_id == categoria_id)

        if usuario_peticion:
            if usuario_peticion.rol in ["admin_sistemas", "admin_mejoramiento"]:
                specs = json.loads(usuario_peticion.especialidades or "[]")
                areas = json.loads(usuario_peticion.areas_asignadas or "[]")
                filtros_visibilidad = [
                    Ticket.asignado_a == usuario_peticion.nombre,
                    Ticket.creador_id == usuario_peticion.id,
                ]
                if specs: filtros_visibilidad.append(Ticket.categoria_id.in_(specs))
                if areas: filtros_visibilidad.append(Ticket.area_creador.in_(areas))
                query = query.where(or_(*filtros_visibilidad))
            elif usuario_peticion.rol == "analyst" and not creador_id:
                query = query.where(or_(Ticket.asignado_a == usuario_peticion.nombre, Ticket.creador_id == usuario_peticion.id))

        if search:
            p = f"%{search}%"
            query = query.where(or_(Ticket.id.ilike(p), Ticket.asunto.ilike(p), Ticket.nombre_creador.ilike(p), Ticket.area_creador.ilike(p)))

        query = query.order_by(Ticket.creado_en.desc()).offset(skip).limit(limit)
        
        try:
            result = await db.execute(query)
            tickets = []
            for row in result:
                try:
                    ticket, verificado = row
                    ticket.correo_verificado_creador = bool(verificado) if verificado is not None else False
                    tickets.append(ticket)
                except (TypeError, ValueError):
                    ticket = row[0] if hasattr(row, "__getitem__") else row
                    if isinstance(ticket, Ticket): ticket.correo_verificado_creador = False
                    tickets.append(ticket)
            return tickets
        except Exception as e:
            import logging
            logging.error(f"ERROR en TicketListService: {str(e)}")
            res_fallback = await db.execute(select(Ticket).offset(skip).limit(limit))
            return list(res_fallback.scalars().all())
