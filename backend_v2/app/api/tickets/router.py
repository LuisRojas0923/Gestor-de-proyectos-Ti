from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import obtener_db
from app.schemas.ticket import (
    Ticket, TicketCrear, TicketActualizar, ComentarioTicket, 
    CategoriaTicket, HistorialTicket, AdjuntoTicket, AdjuntoTicketCrear,
    AdjuntoTicketCompleto
)
from app.models.ticket.ticket import (
    Ticket as TicketModel, 
    ComentarioTicket as ComentarioTicketModel, 
    CategoriaTicket as CategoriaTicketModel,
    HistorialTicket as HistorialModel,
    AdjuntoTicket as AdjuntoModel
)
from app.services.ticket.servicio import ServicioTicket

router = APIRouter()


@router.get("/categorias", response_model=List[CategoriaTicket])
async def listar_categorias(db: Session = Depends(obtener_db)):
    """Retorna lista de categorias de soporte"""
    try:
        return db.query(CategoriaTicketModel).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener categorías: {str(e)}")


@router.get("/estadisticas/resumen")
async def obtener_resumen_estadisticas(db: Session = Depends(obtener_db)):
    """Retorna resumen de estadísticas de tickets"""
    try:
        return ServicioTicket.obtener_estadisticas_resumen(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estadisticas/avanzadas")
async def obtener_estadisticas_avanzadas(db: Session = Depends(obtener_db)):
    """Retorna métricas avanzadas incluyendo SLA y tiempos de resolución"""
    try:
        return ServicioTicket.obtener_estadisticas_avanzadas(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estadisticas/rendimiento")
async def obtener_rendimiento(db: Session = Depends(obtener_db)):
    """Retorna métricas de rendimiento por analista"""
    try:
        # Obtener lista de analistas únicos que tienen tickets asignados
        analistas_raw = db.query(TicketModel.asignado_a).filter(TicketModel.asignado_a != None).distinct().all()
        analistas = [a[0] for a in analistas_raw]
        
        ranking = []
        for nombre in analistas:
            total_analista = db.query(TicketModel).filter(TicketModel.asignado_a == nombre).count()
            resueltos_analista = db.query(TicketModel).filter(
                TicketModel.asignado_a == nombre, 
                TicketModel.estado.in_(["Resuelto", "Cerrado"])
            ).count()
            
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


@router.get("/mis-tickets/{creador_id}", response_model=List[Ticket])
async def listar_mis_tickets(creador_id: str, db: Session = Depends(obtener_db)):
    """Lista tickets de un usuario especifico"""
    try:
        return db.query(TicketModel).filter(TicketModel.creador_id == creador_id).order_by(TicketModel.creado_en.desc()).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[Ticket])
async def listar_tickets(creador_id: Optional[str] = None, estado: Optional[str] = None, db: Session = Depends(obtener_db)):
    """Lista tickets de soporte"""
    try:
        query = db.query(TicketModel)
        if creador_id: query = query.filter(TicketModel.creador_id == creador_id)
        if estado: query = query.filter(TicketModel.estado == estado)
        return query.order_by(TicketModel.creado_en.desc()).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Ticket)
async def crear_ticket(ticket: TicketCrear, db: Session = Depends(obtener_db)):
    """Crea un nuevo ticket de soporte delegando al servicio"""
    try:
        return ServicioTicket.crear_ticket(db, ticket)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticket_id}", response_model=Ticket)
async def obtener_ticket(ticket_id: str, db: Session = Depends(obtener_db)):
    """Obtiene detalles de un ticket"""
    ticket = db.query(TicketModel).filter(TicketModel.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return ticket


@router.post("/{ticket_id}/comentarios", response_model=ComentarioTicket)
async def agregar_comentario(ticket_id: str, comentario: str, db: Session = Depends(obtener_db)):
    """Agrega un comentario a un ticket"""
    try:
        nuevo_comentario = ComentarioTicketModel(ticket_id=ticket_id, comentario=comentario)
        db.add(nuevo_comentario)
        db.commit()
        db.refresh(nuevo_comentario)
        return nuevo_comentario
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{ticket_id}", response_model=Ticket)
async def actualizar_ticket(ticket_id: str, ticket_in: TicketActualizar, db: Session = Depends(obtener_db)):
    """Actualiza campos de un ticket existente delegando al servicio"""
    try:
        return ServicioTicket.actualizar_ticket(db, ticket_id, ticket_in)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticket_id}/historial", response_model=List[HistorialTicket])
async def obtener_historial_ticket(ticket_id: str, db: Session = Depends(obtener_db)):
    """Retorna el log de actividades de un ticket"""
    return db.query(HistorialModel).filter(HistorialModel.ticket_id == ticket_id).order_by(HistorialModel.creado_en.desc()).all()


@router.get("/{ticket_id}/adjuntos", response_model=List[AdjuntoTicket])
async def listar_adjuntos(ticket_id: str, db: Session = Depends(obtener_db)):
    """Lista metadatos de archivos adjuntos de un ticket"""
    return db.query(AdjuntoModel).filter(AdjuntoModel.ticket_id == ticket_id).all()


@router.post("/{ticket_id}/adjuntos", response_model=AdjuntoTicket)
async def subir_adjunto(ticket_id: str, adjunto: AdjuntoTicketCrear, db: Session = Depends(obtener_db)):
    """Guarda un archivo adjunto delegando al servicio"""
    try:
        return ServicioTicket.subir_adjunto(db, ticket_id, adjunto)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/adjuntos/{adjunto_id}", response_model=AdjuntoTicketCompleto)
async def obtener_adjunto(adjunto_id: int, db: Session = Depends(obtener_db)):
    """Retorna un adjunto completo con su contenido Base64"""
    adjunto = db.query(AdjuntoModel).filter(AdjuntoModel.id == adjunto_id).first()
    if not adjunto:
        raise HTTPException(status_code=404, detail="Adjunto no encontrado")
    return adjunto

