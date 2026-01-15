from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional
from ..models.tickets import SupportTicket, TicketCategory, TicketComment
from ..schemas.tickets import SupportTicketCreate, SupportTicketUpdate, TicketCommentCreate
import uuid

# CRUD for Categories
def get_categories(db: Session):
    return db.query(TicketCategory).all()

def create_category(db: Session, category: TicketCategory):
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

# CRUD for Tickets
def get_ticket(db: Session, ticket_id: str):
    db_ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if db_ticket and db_ticket.status == "RESUELTO" and db_ticket.resolved_at:
        # Check if 24 hours have passed
        delta = datetime.now() - db_ticket.resolved_at
        if delta.total_seconds() > 86400: # 24 hours
            db_ticket.status = "CERRADO"
            db_ticket.close_date = datetime.now()
            db.commit()
            db.refresh(db_ticket)
    return db_ticket

def get_tickets_by_creator(db: Session, creator_id: str):
    return db.query(SupportTicket).filter(SupportTicket.creator_id == creator_id).all()

def get_all_tickets(db: Session, skip: int = 0, limit: int = 100):
    return db.query(SupportTicket).offset(skip).limit(limit).all()

def create_ticket(db: Session, ticket: SupportTicketCreate):
    # Generar ID TT-YYYYMMDD-XXX
    today = datetime.now().strftime("%Y%m%d")
    count = db.query(SupportTicket).filter(SupportTicket.id.like(f"TT-{today}-%")).count()
    ticket_id = f"TT-{today}-{(count + 1):03d}"
    
    db_ticket = SupportTicket(
        id=ticket_id,
        **ticket.model_dump()
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def update_ticket(db: Session, ticket_id: str, ticket_update: SupportTicketUpdate):
    db_ticket = get_ticket(db, ticket_id)
    if not db_ticket:
        return None
    
    update_data = ticket_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_ticket, key, value)
    
    if ticket_update.status == "RESUELTO":
        db_ticket.resolved_at = datetime.now()
        
    if ticket_update.status == "Cerrado" and not db_ticket.close_date:
        db_ticket.close_date = datetime.now()
        
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

# CRUD for Comments
def create_ticket_comment(db: Session, comment: TicketCommentCreate):
    db_comment = TicketComment(**comment.model_dump())
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_ticket_comments(db: Session, ticket_id: str):
    return db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id).order_by(TicketComment.created_at.asc()).all()

# Metrics and Stats for Indicators Page
def get_ticket_stats(db: Session):
    total = db.query(SupportTicket).count()
    pendientes = db.query(SupportTicket).filter(SupportTicket.status.in_(["Abierto", "En Proceso", "Pendiente Info"])).count()
    cerrados = db.query(SupportTicket).filter(SupportTicket.status == "Cerrado").count()
    escalados = db.query(SupportTicket).filter(SupportTicket.status == "Escalado").count()
    
    # Promedio de tiempo (si existe close_date)
    # Por ahora algo simple
    
    return {
        "total": total,
        "pendientes": pendientes,
        "cerrados": cerrados,
        "escalados": escalados,
        "completion_rate": (cerrados / total * 100) if total > 0 else 0
    }

from sqlalchemy import func, case

def get_analyst_performance(db: Session):
    # Agrupar por técnico asignado
    results = db.query(
        SupportTicket.assigned_to,
        func.count(SupportTicket.id).label('total'),
        func.sum(case((SupportTicket.status == 'Cerrado', 1), else_=0)).label('cerrados'),
        func.avg(SupportTicket.time_spent_hours).label('avg_time')
    ).filter(SupportTicket.assigned_to != None).group_by(SupportTicket.assigned_to).all()
    
    return [
        {
            "name": r.assigned_to,
            "total": r.total,
            "cerrados": int(r.cerrados or 0),
            "avg_time": float(r.avg_time or 0),
            "performance_score": (int(r.cerrados or 0) / r.total * 100) if r.total > 0 else 0
        } for r in results
    ]
