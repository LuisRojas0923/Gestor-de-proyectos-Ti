"""
Router de Tickets - Backend V2 (Async + SQLModel)
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy import func as sa_func

from app.database import obtener_db
from app.models.ticket.ticket import (
    Ticket,
    ComentarioTicket,
    CategoriaTicket,
    HistorialTicket,
    AdjuntoTicket,
    TicketCrear,
    TicketActualizar,
    AdjuntoCrear,
    ComentarioCrear,
    TicketPublico
)
from app.services.ticket.servicio import ServicioTicket

router = APIRouter()


@router.get("/categorias", response_model=List[CategoriaTicket])
async def listar_categorias(db: AsyncSession = Depends(obtener_db)):
    """Retorna lista de categorias de soporte"""
    try:
        return await ServicioTicket.listar_categorias(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener categorias: {str(e)}")


@router.get("/estadisticas/resumen")
async def obtener_resumen_estadisticas(db: AsyncSession = Depends(obtener_db)):
    """Retorna resumen de estadisticas de tickets"""
    try:
        return await ServicioTicket.obtener_estadisticas_resumen(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estadisticas/avanzadas")
async def obtener_estadisticas_avanzadas(db: AsyncSession = Depends(obtener_db)):
    """Retorna metricas avanzadas incluyendo SLA y tiempos de resolucion"""
    try:
        return await ServicioTicket.obtener_estadisticas_avanzadas(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estadisticas/rendimiento")
async def obtener_rendimiento(db: AsyncSession = Depends(obtener_db)):
    """Retorna metricas de rendimiento por analista"""
    try:
        # Obtener lista de analistas unicos que tienen tickets asignados
        result = await db.execute(
            select(Ticket.asignado_a).where(Ticket.asignado_a != None).distinct()
        )
        analistas = [a[0] for a in result.all()]
        
        ranking = []
        for nombre in analistas:
            total_result = await db.execute(
                select(sa_func.count(Ticket.id)).where(Ticket.asignado_a == nombre)
            )
            total_analista = total_result.scalar() or 0
            
            resueltos_result = await db.execute(
                select(sa_func.count(Ticket.id)).where(
                    Ticket.asignado_a == nombre,
                    Ticket.estado.in_(["Resuelto", "Cerrado"])
                )
            )
            resueltos_analista = resueltos_result.scalar() or 0
            
            score = (resueltos_analista / total_analista * 100) if total_analista > 0 else 0
            
            ranking.append({
                "name": nombre,
                "total": total_analista,
                "cerrados": resueltos_analista,
                "avg_time": 4.5,
                "performance_score": round(score, 1)
            })
        
        ranking.sort(key=lambda x: x["performance_score"], reverse=True)
        return ranking
    except Exception:
        return []


@router.get("/mis-tickets/{creador_id}", response_model=List[TicketPublico])
async def listar_mis_tickets(creador_id: str, db: AsyncSession = Depends(obtener_db)):
    """Lista tickets de un usuario especifico"""
    try:
        return await ServicioTicket.listar_tickets_por_usuario(db, creador_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[TicketPublico])
async def listar_tickets(
    creador_id: Optional[str] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db)
):
    """Lista tickets de soporte"""
    try:
        query = select(Ticket)
        if creador_id:
            query = query.where(Ticket.creador_id == creador_id)
        if estado:
            query = query.where(Ticket.estado == estado)
        query = query.order_by(Ticket.creado_en.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=TicketPublico)
async def crear_ticket(ticket: TicketCrear, db: AsyncSession = Depends(obtener_db)):
    """Crea un nuevo ticket de soporte delegando al servicio"""
    try:
        return await ServicioTicket.crear_ticket(db, ticket)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticket_id}", response_model=TicketPublico)
async def obtener_ticket(ticket_id: str, db: AsyncSession = Depends(obtener_db)):
    """Obtiene detalles de un ticket"""
    try:
        ticket = await ServicioTicket.obtener_ticket_por_id(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        return ticket
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener ticket: {str(e)}")


@router.post("/{ticket_id}/comentarios", response_model=ComentarioTicket)
async def agregar_comentario(
    ticket_id: str,
    comentario_data: ComentarioCrear,
    db: AsyncSession = Depends(obtener_db)
):
    """Agrega un comentario a un ticket"""
    try:
        nuevo_comentario = ComentarioTicket(
            ticket_id=ticket_id,
            comentario=comentario_data.comentario,
            es_interno=comentario_data.es_interno,
            usuario_id=comentario_data.usuario_id,
            nombre_usuario=comentario_data.nombre_usuario
        )
        db.add(nuevo_comentario)
        await db.commit()
        await db.refresh(nuevo_comentario)
        return nuevo_comentario
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{ticket_id}", response_model=TicketPublico)
async def actualizar_ticket(
    ticket_id: str,
    ticket_in: TicketActualizar,
    db: AsyncSession = Depends(obtener_db)
):
    """Actualiza campos de un ticket existente delegando al servicio"""
    try:
        return await ServicioTicket.actualizar_ticket(db, ticket_id, ticket_in)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticket_id}/historial", response_model=List[HistorialTicket])
async def obtener_historial_ticket(ticket_id: str, db: AsyncSession = Depends(obtener_db)):
    """Retorna el log de actividades de un ticket"""
    try:
        result = await db.execute(
            select(HistorialTicket)
            .where(HistorialTicket.ticket_id == ticket_id)
            .order_by(HistorialTicket.creado_en.desc())
        )
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial: {str(e)}")


@router.get("/{ticket_id}/adjuntos", response_model=List[AdjuntoTicket])
async def listar_adjuntos(ticket_id: str, db: AsyncSession = Depends(obtener_db)):
    """Lista metadatos de archivos adjuntos de un ticket"""
    try:
        result = await db.execute(
            select(AdjuntoTicket).where(AdjuntoTicket.ticket_id == ticket_id)
        )
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar adjuntos: {str(e)}")


@router.post("/{ticket_id}/adjuntos", response_model=AdjuntoTicket)
async def subir_adjunto(
    ticket_id: str,
    adjunto: AdjuntoCrear,
    db: AsyncSession = Depends(obtener_db)
):
    """Guarda un archivo adjunto delegando al servicio"""
    try:
        return await ServicioTicket.subir_adjunto(db, ticket_id, adjunto)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/adjuntos/{adjunto_id}", response_model=AdjuntoTicket)
async def obtener_adjunto(adjunto_id: int, db: AsyncSession = Depends(obtener_db)):
    """Retorna un adjunto completo con su contenido Base64"""
    try:
        result = await db.execute(
            select(AdjuntoTicket).where(AdjuntoTicket.id == adjunto_id)
        )
        adjunto = result.scalars().first()
        if not adjunto:
            raise HTTPException(status_code=404, detail="Adjunto no encontrado")
        return adjunto
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener adjunto: {str(e)}")
