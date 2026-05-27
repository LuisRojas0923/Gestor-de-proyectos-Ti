"""
Modelos de catálogos para el módulo Requisición de Personal (RP)
Tablas: areas_rp, cargos_rp, ciudades_rp, aprobadores_area_rp
"""
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship


class AreaRP(SQLModel, table=True):
    """Áreas de la empresa para el módulo de Requisición de Personal"""
    __tablename__ = "areas_rp"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    activo: bool = Field(default=True)
    created_at: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )

    # Relaciones
    cargos: List["CargoRP"] = Relationship(back_populates="area")
    aprobadores: List["AprobadorAreaRP"] = Relationship(back_populates="area")


class CargoRP(SQLModel, table=True):
    """Cargos por área para el módulo de Requisición de Personal"""
    __tablename__ = "cargos_rp"

    id: Optional[int] = Field(default=None, primary_key=True)
    area_id: int = Field(foreign_key="areas_rp.id")
    cargo_superior_id: Optional[int] = Field(default=None, foreign_key="aprobadores_area_rp.id")
    nombre: str = Field(max_length=255)
    activo: bool = Field(default=True)
    created_at: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )

    # Relaciones
    area: Optional[AreaRP] = Relationship(back_populates="cargos")


class CiudadRP(SQLModel, table=True):
    """Ciudades disponibles para la requisición de personal"""
    __tablename__ = "ciudades_rp"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    activo: bool = Field(default=True)
    created_at: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )


class AprobadorAreaRP(SQLModel, table=True):
    """Relación aprobador (usuario) por área para el flujo de aprobación RP"""
    __tablename__ = "aprobadores_area_rp"

    id: Optional[int] = Field(default=None, primary_key=True)
    area_id: int = Field(foreign_key="areas_rp.id")
    nombre_aprobador: str = Field(max_length=255)
    email_aprobador: str = Field(max_length=255)
    activo: bool = Field(default=True)
    created_at: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )

    # Relaciones
    area: Optional[AreaRP] = Relationship(back_populates="aprobadores")
