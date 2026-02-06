"""
Router Reserva de Salas - Backend V2 (Async + SQLModel)
Endpoints: /rooms, /rooms/{id}, /reservations, /reservations/{id}, /reservations/{id}/cancel
"""
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import obtener_db
from app.api.auth.router import obtener_usuario_actual_db
from app.models.auth.usuario import Usuario
from app.models.reserva_salas.models import Room, Reservation
from app.models.reserva_salas.schemas import (
    RoomRead,
    ReservationRead,
    ReservationCreate,
    ReservationUpdate,
    ReservationCancelBody,
)

router = APIRouter()


# ---------- Rooms ----------

@router.get("/rooms", response_model=List[RoomRead])
async def listar_salas(
    capacity_min: Optional[int] = Query(None, description="Capacidad mínima"),
    resources: Optional[str] = Query(None, description="Filtrar por recurso (substring)"),
    is_active: Optional[bool] = Query(None, description="Solo activas"),
    db: AsyncSession = Depends(obtener_db),
):
    """Lista salas con filtros opcionales."""
    q = select(Room)
    if is_active is not None:
        q = q.where(Room.is_active == is_active)
    if capacity_min is not None:
        q = q.where(Room.capacity >= capacity_min)
    if resources:
        # PostgreSQL: array @> ARRAY[resources]
        q = q.where(Room.resources.contains([resources]))
    q = q.order_by(Room.name)
    result = await db.execute(q)
    rooms = result.scalars().all()
    return list(rooms)


@router.get("/rooms/{room_id}", response_model=RoomRead)
async def obtener_sala(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(obtener_db),
):
    """Obtiene una sala por ID."""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    return room


# ---------- Reservations ----------

@router.get("/reservations", response_model=List[ReservationRead])
async def listar_reservas(
    room_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    status: Optional[str] = Query(None, description="ACTIVE | CANCELLED"),
    db: AsyncSession = Depends(obtener_db),
):
    """Lista reservas con filtros."""
    q = select(Reservation)
    if room_id is not None:
        q = q.where(Reservation.room_id == room_id)
    if status is not None:
        q = q.where(Reservation.status == status)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            q = q.where(Reservation.end_datetime >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            q = q.where(Reservation.start_datetime <= end_dt)
        except ValueError:
            pass
    q = q.order_by(Reservation.start_datetime)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [ReservationRead.model_validate(r) for r in rows]


@router.post("/reservations", response_model=ReservationRead)
async def crear_reserva(
    body: ReservationCreate,
    db: AsyncSession = Depends(obtener_db),
):
    """Crea una nueva reserva."""
    if body.end_datetime <= body.start_datetime:
        raise HTTPException(status_code=400, detail="end_datetime debe ser posterior a start_datetime")
    # Verificar solapamientos (misma sala, mismo horario)
    overlap_result = await db.execute(
        select(Reservation).where(
            Reservation.room_id == body.room_id,
            Reservation.status == "ACTIVE",
            Reservation.start_datetime < body.end_datetime,
            Reservation.end_datetime > body.start_datetime,
        )
    )
    if overlap_result.scalars().first() is not None:
        raise HTTPException(status_code=409, detail="La sala ya tiene una reserva en ese horario")
    reservation = Reservation(
        room_id=body.room_id,
        start_datetime=body.start_datetime,
        end_datetime=body.end_datetime,
        title=body.title,
        created_by_name=body.created_by_name,
        created_by_document=body.created_by_document,
        status="ACTIVE",
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return ReservationRead.model_validate(reservation)


@router.get("/reservations/{reservation_id}", response_model=ReservationRead)
async def obtener_reserva(
    reservation_id: uuid.UUID,
    db: AsyncSession = Depends(obtener_db),
):
    """Obtiene una reserva por ID."""
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reservation


@router.put("/reservations/{reservation_id}", response_model=ReservationRead)
async def actualizar_reserva(
    reservation_id: uuid.UUID,
    body: ReservationUpdate,
    db: AsyncSession = Depends(obtener_db),
):
    """Actualiza fechas o título de una reserva."""
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Solo se puede actualizar una reserva activa")
    start = body.start_datetime if body.start_datetime is not None else reservation.start_datetime
    end = body.end_datetime if body.end_datetime is not None else reservation.end_datetime
    if end <= start:
        raise HTTPException(status_code=400, detail="end_datetime debe ser posterior a start_datetime")
    if body.title is not None:
        reservation.title = body.title
    if body.start_datetime is not None:
        reservation.start_datetime = body.start_datetime
    if body.end_datetime is not None:
        reservation.end_datetime = body.end_datetime
    reservation.updated_by_name = body.updated_by_name
    reservation.updated_by_document = body.updated_by_document
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.post("/reservations/{reservation_id}/cancel", response_model=ReservationRead)
async def cancelar_reserva(
    reservation_id: uuid.UUID,
    body: ReservationCancelBody,
    db: AsyncSession = Depends(obtener_db),
):
    """Cancela una reserva (soft: status = CANCELLED)."""
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reservation.status == "CANCELLED":
        return reservation
    reservation.status = "CANCELLED"
    reservation.cancelled_by_name = body.cancelled_by_name
    reservation.cancelled_by_document = body.cancelled_by_document
    await db.commit()
    await db.refresh(reservation)
    return reservation
