from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import SessionLocal
from ..schemas import tickets as schemas
from ..crud import tickets as crud

router = APIRouter(
    prefix="/soporte",
    tags=["soporte"],
    responses={404: {"description": "Not found"}},
)

# Dependencia de DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Endpoints de Categorías
@router.get("/categorias", response_model=List[schemas.TicketCategory])
def read_categories(db: Session = Depends(get_db)):
    return crud.get_categories(db)

# Endpoints de Tickets
@router.post("/", response_model=schemas.SupportTicket)
def create_ticket(ticket: schemas.SupportTicketCreate, db: Session = Depends(get_db)):
    return crud.create_ticket(db=db, ticket=ticket)

@router.get("/mis-tickets/{creator_id}", response_model=List[schemas.SupportTicket])
def read_my_tickets(creator_id: str, db: Session = Depends(get_db)):
    return crud.get_tickets_by_creator(db, creator_id=creator_id)

@router.get("/estadisticas/resumen")
def get_ticket_summary(db: Session = Depends(get_db)):
    return crud.get_ticket_stats(db)


@router.get("/estadisticas/rendimiento")
def get_analyst_performance(db: Session = Depends(get_db)):
    return crud.get_analyst_performance(db)


@router.get("/{ticket_id}", response_model=schemas.SupportTicket)
def read_ticket(ticket_id: str, db: Session = Depends(get_db)):
    db_ticket = crud.get_ticket(db, ticket_id=ticket_id)
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket

@router.patch("/{ticket_id}", response_model=schemas.SupportTicket)
def update_ticket(ticket_id: str, ticket_update: schemas.SupportTicketUpdate, db: Session = Depends(get_db)):
    db_ticket = crud.update_ticket(db, ticket_id=ticket_id, ticket_update=ticket_update)
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket

@router.get("/", response_model=List[schemas.SupportTicket])
def read_all_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_all_tickets(db, skip=skip, limit=limit)

# Endpoints de Comentarios
@router.post("/{ticket_id}/comentarios", response_model=schemas.TicketComment)
def create_comment(ticket_id: str, comment: schemas.TicketCommentBase, db: Session = Depends(get_db)):
    # Aquí se debería obtener el usuario actual del token JTW
    # Por ahora simulamos
    db_comment = crud.create_ticket_comment(db, schemas.TicketCommentCreate(
        ticket_id=ticket_id,
        comment=comment.comment,
        is_internal=comment.is_internal,
        user_id="anonymous",
        user_name="Usuario"
    ))
    return db_comment

@router.get("/{ticket_id}/comentarios", response_model=List[schemas.TicketComment])
def read_comments(ticket_id: str, db: Session = Depends(get_db)):
    return crud.get_ticket_comments(db, ticket_id=ticket_id)


