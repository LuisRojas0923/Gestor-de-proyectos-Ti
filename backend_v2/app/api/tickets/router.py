"""
API de Tickets - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import obtener_db
from app.schemas.ticket import Ticket, TicketCrear, ComentarioTicket, CategoriaTicket
from app.models.ticket.ticket import Ticket as TicketModel, ComentarioTicket as ComentarioTicketModel, CategoriaTicket as CategoriaTicketModel, SolicitudDesarrollo

router = APIRouter()


@router.get("/categorias", response_model=List[CategoriaTicket])
async def listar_categorias(db: Session = Depends(obtener_db)):
    """Retorna lista de categorias de soporte"""
    try:
        categorias = db.query(CategoriaTicketModel).all()
        return categorias
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener categorías: {str(e)}")


@router.get("/estadisticas/resumen")
async def obtener_resumen_estadisticas(db: Session = Depends(obtener_db)):
    """Retorna resumen de estadísticas de tickets"""
    try:
        total = db.query(TicketModel).count()
        nuevos = db.query(TicketModel).filter(TicketModel.estado == "Nuevo").count()
        en_proceso = db.query(TicketModel).filter(TicketModel.estado == "En Proceso").count()
        pendientes_info = db.query(TicketModel).filter(TicketModel.estado == "Pendiente Info").count()
        escalados = db.query(TicketModel).filter(TicketModel.estado == "Escalado").count()
        cerrados = db.query(TicketModel).filter(TicketModel.estado == "Cerrado").count()
        resueltos = db.query(TicketModel).filter(TicketModel.estado == "Resuelto").count()
        
        # Pendientes totales para el frontend
        pendientes = nuevos + en_proceso + pendientes_info + escalados
        
        return {
            "total": total,
            "nuevos": nuevos,
            "en_proceso": en_proceso,
            "pendientes": pendientes,
            "cerrados": cerrados + resueltos,
            "escalados": escalados,
            "completion_rate": round(((cerrados + resueltos) / total * 100) if total > 0 else 0, 1),
            "total_tickets": total
        }
    except Exception as e:
        print(f"Error en obtener_resumen_estadisticas: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")


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
            
            # Score ficticio pero basado en resolución
            score = (resueltos_analista / total_analista * 100) if total_analista > 0 else 0
            
            ranking.append({
                "name": nombre,
                "total": total_analista,
                "cerrados": resueltos_analista,
                "avg_time": 4.5, # Placeholder por ahora
                "performance_score": round(score, 1)
            })
        
        # Ordenar por score descendente
        ranking.sort(key=lambda x: x["performance_score"], reverse=True)
        
        # Si no hay analistas, devolver lista vacía o data de prueba para que no se vea vacío
        if not ranking:
            return []
            
        return ranking
    except Exception as e:
        print(f"Error en obtener_rendimiento: {e}")
        return []


@router.get("/mis-tickets/{creador_id}")
async def listar_mis_tickets(
    creador_id: str,
    db: Session = Depends(obtener_db)
):
    """Lista tickets de un usuario especifico"""
    try:
        tickets = db.query(TicketModel).filter(
            TicketModel.creador_id == creador_id
        ).order_by(TicketModel.creado_en.desc()).all()
        
        # Serializar manualmente para evitar problemas con relaciones
        result = []
        for t in tickets:
            result.append({
                "id": t.id,
                "categoria_id": t.categoria_id,
                "asunto": t.asunto,
                "descripcion": t.descripcion,
                "prioridad": t.prioridad,
                "estado": t.estado,
                "creador_id": t.creador_id,
                "nombre_creador": t.nombre_creador,
                "correo_creador": t.correo_creador,
                "area_creador": t.area_creador,
                "cargo_creador": t.cargo_creador,
                "sede_creador": t.sede_creador,
                "asignado_a": t.asignado_a,
                "diagnostico": t.diagnostico,
                "resolucion": t.resolucion,
                "notas": t.notas,
                "horas_tiempo_empleado": float(t.horas_tiempo_empleado) if t.horas_tiempo_empleado else None,
                "desarrollo_id": t.desarrollo_id,
                "datos_extra": t.datos_extra,
                "fecha_entrega_ideal": t.fecha_entrega_ideal.isoformat() if t.fecha_entrega_ideal else None,
                "fecha_creacion": t.fecha_creacion.isoformat() if t.fecha_creacion else None,
                "fecha_cierre": t.fecha_cierre.isoformat() if t.fecha_cierre else None,
                "resuelto_en": t.resuelto_en.isoformat() if t.resuelto_en else None,
                "creado_en": t.creado_en.isoformat() if t.creado_en else None,
                "actualizado_en": t.actualizado_en.isoformat() if t.actualizado_en else None
            })
        return result
    except Exception as e:
        print(f"Error en listar_mis_tickets: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener tickets: {str(e)}")


@router.get("/")
async def listar_tickets(
    creador_id: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(obtener_db)
):
    """Lista tickets de soporte"""
    try:
        query = db.query(TicketModel)
        if creador_id:
            query = query.filter(TicketModel.creador_id == creador_id)
        if estado:
            query = query.filter(TicketModel.estado == estado)
        
        tickets = query.order_by(TicketModel.creado_en.desc()).all()
        
        # Serializar manualmente
        result = []
        for t in tickets:
            result.append({
                "id": t.id,
                "categoria_id": t.categoria_id,
                "asunto": t.asunto,
                "descripcion": t.descripcion,
                "prioridad": t.prioridad,
                "estado": t.estado,
                "creador_id": t.creador_id,
                "nombre_creador": t.nombre_creador,
                "correo_creador": t.correo_creador,
                "area_creador": t.area_creador,
                "asignado_a": t.asignado_a,
                "fecha_creacion": t.fecha_creacion.isoformat() if t.fecha_creacion else None,
                "creado_en": t.creado_en.isoformat() if t.creado_en else None,
                "actualizado_en": t.actualizado_en.isoformat() if t.actualizado_en else None
            })
        return result
    except Exception as e:
        print(f"Error en listar_tickets: {e}")
        raise HTTPException(status_code=500, detail=f"Error al listar tickets: {str(e)}")


@router.post("/")
async def crear_ticket(
    ticket: TicketCrear, 
    db: Session = Depends(obtener_db)
):
    """Crea un nuevo ticket de soporte"""
    try:
        # 1. Crear el ticket principal
        nuevo_ticket = TicketModel(
            id=ticket.id,
            categoria_id=ticket.categoria_id,
            asunto=ticket.asunto,
            descripcion=ticket.descripcion,
            creador_id=ticket.creador_id,
            nombre_creador=ticket.nombre_creador,
            correo_creador=ticket.correo_creador,
            area_creador=ticket.area_creador,
            prioridad=ticket.prioridad or "Media",
            estado="Nuevo",
            datos_extra=ticket.datos_extra
        )
        db.add(nuevo_ticket)
        
        # 2. Si hay datos de desarrollo
        if ticket.que_necesita or ticket.porque:
            solicitud = SolicitudDesarrollo(
                ticket_id=ticket.id,
                que_necesita=ticket.que_necesita,
                porque=ticket.porque,
                paraque=ticket.paraque,
                justificacion_ia=ticket.justificacion_ia
            )
            db.add(solicitud)
            
        db.commit()
        db.refresh(nuevo_ticket)
        
        return {
            "id": nuevo_ticket.id,
            "categoria_id": nuevo_ticket.categoria_id,
            "asunto": nuevo_ticket.asunto,
            "descripcion": nuevo_ticket.descripcion,
            "prioridad": nuevo_ticket.prioridad,
            "estado": nuevo_ticket.estado,
            "creador_id": nuevo_ticket.creador_id,
            "creado_en": nuevo_ticket.creado_en.isoformat() if nuevo_ticket.creado_en else None
        }
    except Exception as e:
        db.rollback()
        print(f"Error en crear_ticket: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear ticket: {str(e)}")


@router.get("/{ticket_id}")
async def obtener_ticket(
    ticket_id: str, 
    db: Session = Depends(obtener_db)
):
    """Obtiene detalles de un ticket"""
    try:
        ticket = db.query(TicketModel).filter(TicketModel.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        return {
            "id": ticket.id,
            "categoria_id": ticket.categoria_id,
            "asunto": ticket.asunto,
            "descripcion": ticket.descripcion,
            "prioridad": ticket.prioridad,
            "estado": ticket.estado,
            "creador_id": ticket.creador_id,
            "nombre_creador": ticket.nombre_creador,
            "asignado_a": ticket.asignado_a,
            "diagnostico": ticket.diagnostico,
            "resolucion": ticket.resolucion,
            "creado_en": ticket.creado_en.isoformat() if ticket.creado_en else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener ticket: {str(e)}")


@router.post("/{ticket_id}/comentarios")
async def agregar_comentario(
    ticket_id: str,
    comentario: str,
    db: Session = Depends(obtener_db)
):
    """Agrega un comentario a un ticket"""
    try:
        nuevo_comentario = ComentarioTicketModel(
            ticket_id=ticket_id,
            comentario=comentario
        )
        db.add(nuevo_comentario)
        db.commit()
        db.refresh(nuevo_comentario)
        
        return {
            "id": nuevo_comentario.id,
            "ticket_id": nuevo_comentario.ticket_id,
            "comentario": nuevo_comentario.comentario,
            "creado_en": nuevo_comentario.creado_en.isoformat() if nuevo_comentario.creado_en else None
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al agregar comentario: {str(e)}")
