from typing import Optional
from sqlmodel import SQLModel, Field

class ERPCentroCostoUen(SQLModel, table=True):
    """Modelo para UEN del Centro de Costo en el ERP"""
    __tablename__ = "erp_centro_costo_uen"

    codigo: str = Field(primary_key=True, max_length=10)
    nombre: str = Field(max_length=100)
    activo: bool = Field(default=True)


class ERPSubcentroCosto(SQLModel, table=True):
    """Modelo para Subcentro de Costo (Procesos/Gastos) en el ERP"""
    __tablename__ = "erp_subcentro_costo"

    codigo: str = Field(primary_key=True, max_length=10)
    nombre: str = Field(max_length=100)
    activo: bool = Field(default=True)


class ERPEspecialidad(SQLModel, table=True):
    """Modelo para Especialidad del Centro de Costo en el ERP"""
    __tablename__ = "erp_especialidad"

    codigo: str = Field(primary_key=True, max_length=10)
    nombre: str = Field(max_length=100)
    activo: bool = Field(default=True)
