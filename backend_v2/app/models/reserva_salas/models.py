"""
Modelos de Reserva de Salas - Backend V2 (SQLModel)
Tablas: rooms, reservation_series, reservations, reservation_audit
"""
import uuid
from typing import Optional, List
from datetime import datetime, date, time
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY, JSONB
from sqlalchemy import text


def _uuid_pk():
    return Column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))


class Room(SQLModel, table=True):
    """Salas disponibles para reserva"""
    __tablename__ = "rooms"

    id: Optional[uuid.UUID] = Field(default=None, sa_column=_uuid_pk())
    name: str = Field(max_length=255)
    capacity: int = Field(default=1)
    resources: List[str] = Field(default_factory=list, sa_column=Column(ARRAY(Text)))
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": text("now()")})
    updated_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": text("now()")})

    reservations: List["Reservation"] = Relationship(back_populates="room")


class ReservationSeries(SQLModel, table=True):
    """Series de reservas repetitivas (uso futuro)"""
    __tablename__ = "reservation_series"

    id: Optional[uuid.UUID] = Field(default=None, sa_column=_uuid_pk())
    room_id: uuid.UUID = Field(foreign_key="rooms.id")
    start_time: time
    end_time: time
    title: str = Field(max_length=255)
    pattern_type: str = Field(max_length=20)
    pattern_interval: int = Field(default=1)
    start_date: date = Field()
    end_date: Optional[date] = Field(default=None)
    created_by_name: str = Field(max_length=255)
    created_by_document: str = Field(max_length=100)
    created_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": text("now()")})


class Reservation(SQLModel, table=True):
    """Reservas de salas"""
    __tablename__ = "reservations"

    id: Optional[uuid.UUID] = Field(default=None, sa_column=_uuid_pk())
    room_id: uuid.UUID = Field(foreign_key="rooms.id")
    series_id: Optional[uuid.UUID] = Field(default=None, foreign_key="reservation_series.id")
    start_datetime: datetime = Field(sa_column=Column(DateTime(timezone=True)))
    end_datetime: datetime = Field(sa_column=Column(DateTime(timezone=True)))
    title: str = Field(max_length=255)
    status: str = Field(default="ACTIVE", max_length=20)
    created_by_name: str = Field(max_length=255)
    created_by_document: str = Field(max_length=100)
    updated_by_name: Optional[str] = Field(default=None, max_length=255)
    updated_by_document: Optional[str] = Field(default=None, max_length=100)
    cancelled_by_name: Optional[str] = Field(default=None, max_length=255)
    cancelled_by_document: Optional[str] = Field(default=None, max_length=100)
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=text("now()")),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=text("now()")),
    )

    room: Optional[Room] = Relationship(back_populates="reservations")


class ReservationAudit(SQLModel, table=True):
    """Auditoría de cambios en reservas"""
    __tablename__ = "reservation_audit"

    id: Optional[int] = Field(default=None, primary_key=True)
    reservation_id: uuid.UUID = Field(foreign_key="reservations.id")
    action: str = Field(max_length=50)
    changed_by_name: Optional[str] = Field(default=None, max_length=255)
    changed_by_document: Optional[str] = Field(default=None, max_length=100)
    old_data: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    new_data: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    created_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": text("now()")})
