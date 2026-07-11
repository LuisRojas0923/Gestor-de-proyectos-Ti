"""Relaciones M:N que delimitan el alcance operativo sobre empleados ERP."""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class RelacionGestorEmpleado(SQLModel, table=True):
    __tablename__ = "relaciones_gestor_empleado"
    __table_args__ = (
        UniqueConstraint(
            "gestor_usuario_id", "empleado_cedula", name="uq_relacion_gestor_empleado"
        ),
    )

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(PGUUID(as_uuid=True), primary_key=True),
    )
    gestor_usuario_id: str = Field(foreign_key="usuarios.id", max_length=50)
    empleado_cedula: str = Field(max_length=50)
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


class HistorialRelacionGestorEmpleado(SQLModel, table=True):
    __tablename__ = "historial_relaciones_gestor_empleado"

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(PGUUID(as_uuid=True), primary_key=True),
    )
    relacion_id: UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("relaciones_gestor_empleado.id", ondelete="RESTRICT"),
        )
    )
    actor_usuario_id: str = Field(foreign_key="usuarios.id", max_length=50)
    accion: str = Field(max_length=20)
    estado_anterior: bool
    estado_nuevo: bool
    creado_en: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
