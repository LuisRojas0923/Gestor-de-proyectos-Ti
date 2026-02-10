"""
Router Reserva de Salas - Backend V2 (Async + SQLModel)
Endpoints: /rooms, /rooms/{id}, /reservations, /reservations/{id}, /reservations/{id}/cancel
Horario permitido para reservas: 7:00 - 18:00 (America/Bogota).
"""
import uuid
from typing import List, Optional
from datetime import datetime, time as dt_time, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import obtener_db
from app.api.auth.router import obtener_usuario_actual_db
from app.models.auth.usuario import Usuario
from app.models.reserva_salas.models import Room, Reservation
from app.models.reserva_salas.schemas import (
    RoomRead,
    RoomCreate,
    RoomUpdate,
    ReservationRead,
    ReservationCreate,
    ReservationUpdate,
    ReservationCancelBody,
)

router = APIRouter()

# Horario permitido para reservas: 7:00 - 18:00 (6 PM), zona America/Bogota (UTC-5)
RESERVATION_MIN_TIME = dt_time(7, 0, 0)   # 7:00 AM
RESERVATION_MAX_TIME = dt_time(18, 0, 0)  # 6:00 PM
RESERVATION_TZ = timezone(timedelta(hours=-5))  # Colombia, sin DST


def _local_time(dt: datetime) -> dt_time:
    """Obtiene la hora en America/Bogota del datetime para validar horario (7:00-18:00)."""
    if dt.tzinfo is not None:
        local = dt.astimezone(RESERVATION_TZ)
    else:
        local = dt.replace(tzinfo=timezone.utc).astimezone(RESERVATION_TZ)
    return dt_time(local.hour, local.minute, local.second)


def _dentro_horario_permitido(start: datetime, end: datetime) -> bool:
    """True si inicio y fin están dentro del horario 7:00 - 18:00."""
    start_t = _local_time(start)
    end_t = _local_time(end)
    return start_t >= RESERVATION_MIN_TIME and end_t <= RESERVATION_MAX_TIME


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


@router.post("/rooms", response_model=RoomRead)
async def crear_sala(
    body: RoomCreate,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Crea una nueva sala. Solo admin."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden crear salas")
    room = Room(
        name=body.name,
        capacity=body.capacity,
        resources=body.resources or [],
        is_active=body.is_active,
        notes=body.notes,
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.put("/rooms/{room_id}", response_model=RoomRead)
async def actualizar_sala(
    room_id: uuid.UUID,
    body: RoomUpdate,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Actualiza una sala. Solo admin."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden editar salas")
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if body.name is not None:
        room.name = body.name
    if body.capacity is not None:
        room.capacity = body.capacity
    if body.resources is not None:
        room.resources = body.resources
    if body.is_active is not None:
        room.is_active = body.is_active
    if body.notes is not None:
        room.notes = body.notes
    await db.commit()
    await db.refresh(room)
    return room


@router.delete("/rooms/{room_id}", response_model=RoomRead)
async def desactivar_sala(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Desactiva una sala (soft: is_active = False). Solo admin."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden desactivar salas")
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    room.is_active = False
    await db.commit()
    await db.refresh(room)
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
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Crea una nueva reserva. Solo en horario 7:00 - 18:00."""
    print(f"DEBUG: Intentando crear reserva. Usuario={usuario.nombre}, Documento={usuario.cedula}")
    print(f"DEBUG: Datos reserva: {body}")

    # Normalizar zonas horarias
    start = body.start_datetime
    end = body.end_datetime
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)

    if end <= start:
        raise HTTPException(status_code=400, detail="end_datetime debe ser posterior a start_datetime")
    
    if not _dentro_horario_permitido(start, end):
        raise HTTPException(
            status_code=400,
            detail="Las reservas solo están permitidas entre las 7:00 AM y las 6:00 PM (18:00).",
        )

    # Verificar solapamientos (misma sala, mismo horario)
    overlap_result = await db.execute(
        select(Reservation).where(
            Reservation.room_id == body.room_id,
            Reservation.status == "ACTIVE",
            Reservation.start_datetime < end,
            Reservation.end_datetime > start,
        )
    )
    if overlap_result.scalars().first() is not None:
        raise HTTPException(status_code=409, detail="La sala ya tiene una reserva en ese horario")
    
    reservation = Reservation(
        room_id=body.room_id,
        start_datetime=start,
        end_datetime=end,
        title=body.title,
        created_by_name=usuario.nombre,
        created_by_document=usuario.cedula,
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
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Actualiza fechas o título de una reserva. Solo creador o admin."""
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Verificar propiedad o admin
    if reservation.created_by_document != usuario.cedula and usuario.rol != "admin":
        raise HTTPException(
            status_code=403, 
            detail="No tienes permiso para modificar esta reserva. Solo el creador o un administrador pueden hacerlo."
        )

    if reservation.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Solo se puede actualizar una reserva activa")
    
    # Normalizar zonas horarias
    start = body.start_datetime if body.start_datetime is not None else reservation.start_datetime
    end = body.end_datetime if body.end_datetime is not None else reservation.end_datetime
    
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)

    if end <= start:
        raise HTTPException(status_code=400, detail="end_datetime debe ser posterior a start_datetime")
    
    if not _dentro_horario_permitido(start, end):
        raise HTTPException(
            status_code=400,
            detail="Las reservas solo están permitidas entre las 7:00 AM y las 6:00 PM (18:00).",
        )

    # Verificar solapamientos
    overlap_result = await db.execute(
        select(Reservation).where(
            Reservation.room_id == reservation.room_id,
            Reservation.status == "ACTIVE",
            Reservation.id != reservation.id,
            Reservation.start_datetime < end,
            Reservation.end_datetime > start,
        )
    )
    if overlap_result.scalars().first() is not None:
        raise HTTPException(status_code=409, detail="La sala ya tiene una reserva en ese horario")

    # Aplicar cambios
    if body.title is not None:
        reservation.title = body.title
    if body.start_datetime is not None:
        new_start = body.start_datetime
        if new_start.tzinfo is None:
            new_start = new_start.replace(tzinfo=timezone.utc)
        reservation.start_datetime = new_start
    if body.end_datetime is not None:
        new_end = body.end_datetime
        if new_end.tzinfo is None:
            new_end = new_end.replace(tzinfo=timezone.utc)
        reservation.end_datetime = new_end

    reservation.updated_by_name = usuario.nombre
    reservation.updated_by_document = usuario.cedula
    
    await db.commit()
    await db.refresh(reservation)
    return reservation



@router.post("/reservations/{reservation_id}/cancel", response_model=ReservationRead)
async def cancelar_reserva(
    reservation_id: uuid.UUID,
    body: ReservationCancelBody,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    """Cancela una reserva (soft: status = CANCELLED). Solo creador o admin."""
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Verificar propiedad o admin
    if reservation.created_by_document != usuario.cedula and usuario.rol != "admin":
        raise HTTPException(
            status_code=403, 
            detail="No tienes permiso para cancelar esta reserva. Solo el creador o un administrador pueden hacerlo."
        )

    if reservation.status == "CANCELLED":
        return reservation
    reservation.status = "CANCELLED"
    reservation.cancelled_by_name = usuario.nombre
    reservation.cancelled_by_document = usuario.cedula
    await db.commit()
    await db.refresh(reservation)
    return reservation
