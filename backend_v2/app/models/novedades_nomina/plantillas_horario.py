"""Modelos persistentes del catalogo auditable de plantillas de horario."""
from datetime import datetime, time
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint, Column, DateTime, ForeignKey, SmallInteger, String, Time,
    UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlmodel import Field, SQLModel


def _uuid_pk() -> Column:
    return Column(PGUUID(as_uuid=True), primary_key=True, nullable=False)


class NominaPlantillaHorario(SQLModel, table=True):
    __tablename__ = "nomina_plantillas_horario"
    __table_args__ = (
        CheckConstraint("version > 0", name="ck_plantilla_version_positiva"),
    )

    id: UUID = Field(default_factory=uuid4, sa_column=_uuid_pk())
    nombre: str = Field(max_length=120)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    version: int = Field(default=1, ge=1)
    esta_activa: bool = Field(default=True)
    creado_por_id: str = Field(foreign_key="usuarios.id", max_length=50)
    actualizado_por_id: str = Field(foreign_key="usuarios.id", max_length=50)
    creado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
    actualizado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )


class NominaPlantillaHorarioDia(SQLModel, table=True):
    __tablename__ = "nomina_plantillas_horario_dias"
    __table_args__ = (
        CheckConstraint(
            "dia_semana BETWEEN 1 AND 7", name="ck_plantilla_dia_rango"
        ),
        CheckConstraint(
            "minutos_almuerzo BETWEEN 0 AND 240",
            name="ck_plantilla_almuerzo_rango",
        ),
        CheckConstraint(
            "(hora_entrada IS NULL) = (hora_salida IS NULL)",
            name="ck_plantilla_horas_par",
        ),
    )

    plantilla_id: UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("nomina_plantillas_horario.id", ondelete="RESTRICT"),
            primary_key=True,
        )
    )
    dia_semana: int = Field(sa_column=Column(SmallInteger, primary_key=True))
    hora_entrada: Optional[time] = Field(default=None, sa_column=Column(Time))
    hora_salida: Optional[time] = Field(default=None, sa_column=Column(Time))
    minutos_almuerzo: int = Field(default=0, ge=0, le=240)
    cruza_medianoche: bool = Field(default=False)


class NominaPlantillaHorarioHistorial(SQLModel, table=True):
    __tablename__ = "nomina_plantillas_horario_historial"

    id: UUID = Field(default_factory=uuid4, sa_column=_uuid_pk())
    plantilla_id: UUID = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("nomina_plantillas_horario.id", ondelete="RESTRICT"))
    )
    accion: str = Field(max_length=30)
    version: int
    actor_usuario_id: str = Field(foreign_key="usuarios.id", max_length=50)
    snapshot: dict = Field(sa_column=Column(JSONB, nullable=False))
    creado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )


class OperacionIdempotente(SQLModel, table=True):
    __tablename__ = "operaciones_idempotentes"

    solicitud_id: UUID = Field(sa_column=Column(PGUUID(as_uuid=True), primary_key=True))
    tipo_operacion: str = Field(sa_column=Column(String(50), primary_key=True))
    actor_usuario_id: str = Field(foreign_key="usuarios.id", max_length=50)
    recurso_objetivo: str = Field(max_length=150)
    payload_hash: str = Field(max_length=64)
    estado: str = Field(default="EN_PROCESO", max_length=20)
    resultado: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    creado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
    finalizado_en: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )


class NominaAplicacionPlantillaHorario(SQLModel, table=True):
    __tablename__ = "nomina_aplicaciones_plantilla_horario"
    __table_args__ = (
        UniqueConstraint(
            "solicitud_id", "plantilla_id", name="uq_aplicacion_solicitud_plantilla"
        ),
    )

    id: UUID = Field(default_factory=uuid4, sa_column=_uuid_pk())
    solicitud_id: UUID = Field(sa_column=Column(PGUUID(as_uuid=True), nullable=False))
    plantilla_id: UUID = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("nomina_plantillas_horario.id", ondelete="RESTRICT"))
    )
    plantilla_version: int
    plantilla_nombre: str = Field(max_length=120)
    actor_usuario_id: str = Field(foreign_key="usuarios.id", max_length=50)
    cantidad_empleados: int
    estado: str = Field(max_length=20)
    creado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )


class NominaAplicacionPlantillaEmpleado(SQLModel, table=True):
    __tablename__ = "nomina_aplicaciones_plantilla_empleados"

    aplicacion_id: UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("nomina_aplicaciones_plantilla_horario.id", ondelete="RESTRICT"),
            primary_key=True,
        )
    )
    empleado_cedula: str = Field(sa_column=Column(String(50), primary_key=True))
    snapshot_anterior: dict = Field(sa_column=Column(JSONB, nullable=False))
    snapshot_aplicado: dict = Field(sa_column=Column(JSONB, nullable=False))
    estado: str = Field(max_length=20)
    creado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
