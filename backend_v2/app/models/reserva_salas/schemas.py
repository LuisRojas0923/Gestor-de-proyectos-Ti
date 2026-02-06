"""
Schemas Pydantic para API de Reserva de Salas - Backend V2
"""
import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import ConfigDict
from sqlmodel import SQLModel


# --- Rooms ---

class RoomRead(SQLModel):
    """Respuesta de sala (compatible con frontend)"""
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    capacity: int
    resources: List[str] = []
    is_active: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RoomCreate(SQLModel):
    """Crear sala (admin, uso futuro)"""
    name: str
    capacity: int = 1
    resources: List[str] = []
    is_active: bool = True
    notes: Optional[str] = None


# --- Reservations ---

class ReservationCreate(SQLModel):
    """Crear reserva"""
    room_id: uuid.UUID
    start_datetime: datetime
    end_datetime: datetime
    title: str
    created_by_name: str
    created_by_document: str


class ReservationUpdate(SQLModel):
    """Actualizar reserva (fechas/título)"""
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    title: Optional[str] = None
    updated_by_name: str
    updated_by_document: str


class ReservationCancelBody(SQLModel):
    """Cancelar reserva"""
    cancelled_by_name: str
    cancelled_by_document: str


class ReservationRead(SQLModel):
    """Respuesta de reserva (compatible con frontend)"""
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    room_id: uuid.UUID
    start_datetime: datetime
    end_datetime: datetime
    title: str
    status: str
    series_id: Optional[uuid.UUID] = None
    created_by_name: str
    created_by_document: str
    updated_by_name: Optional[str] = None
    updated_by_document: Optional[str] = None
    created_at: datetime
    updated_at: datetime
