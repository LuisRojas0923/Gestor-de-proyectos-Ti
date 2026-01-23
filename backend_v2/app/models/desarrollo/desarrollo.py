"""
Modelos de Desarrollo - Backend V2 (SQLModel)
"""
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship


# --- Modelos de Base de Datos (table=True) ---

class FaseDesarrollo(SQLModel, table=True):
    """Fases del ciclo de desarrollo"""
    __tablename__ = "fases_desarrollo"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)
    codigo: str = Field(unique=True, max_length=20)
    orden: int
    descripcion: Optional[str] = Field(default=None)
    color: str = Field(default="#3498db", max_length=20)
    esta_activa: bool = Field(default=True)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    # Relaciones
    etapas: List["EtapaDesarrollo"] = Relationship(back_populates="fase")
    desarrollos: List["Desarrollo"] = Relationship(back_populates="fase_actual")


class EtapaDesarrollo(SQLModel, table=True):
    """Etapas dentro de cada fase"""
    __tablename__ = "etapas_desarrollo"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    fase_id: int = Field(foreign_key="fases_desarrollo.id")
    nombre: str = Field(max_length=100)
    codigo: str = Field(max_length=20)
    orden: int
    descripcion: Optional[str] = Field(default=None)
    duracion_estimada_dias: Optional[int] = Field(default=None)
    porcentaje_inicio: Decimal = Field(default=Decimal("0.0"))
    porcentaje_fin: Decimal = Field(default=Decimal("100.0"))
    esta_activa: bool = Field(default=True)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    # Relaciones
    fase: Optional[FaseDesarrollo] = Relationship(back_populates="etapas")
    desarrollos: List["Desarrollo"] = Relationship(back_populates="etapa_actual")


class Desarrollo(SQLModel, table=True):
    """Modelo principal de desarrollo/proyecto"""
    __tablename__ = "desarrollos"
    
    id: str = Field(primary_key=True, max_length=50)
    nombre: str = Field(max_length=255)
    descripcion: Optional[str] = Field(default=None)
    modulo: Optional[str] = Field(default=None, max_length=100)
    tipo: Optional[str] = Field(default=None, max_length=50)
    ambiente: Optional[str] = Field(default=None, max_length=100)
    enlace_portal: Optional[str] = Field(default=None)
    proveedor: Optional[str] = Field(default=None, max_length=100)
    responsable: Optional[str] = Field(default=None, max_length=255)
    
    # Estado y progreso
    estado_general: str = Field(default="Pendiente", max_length=50)
    fase_actual_id: Optional[int] = Field(default=None, foreign_key="fases_desarrollo.id")
    etapa_actual_id: Optional[int] = Field(default=None, foreign_key="etapas_desarrollo.id")
    porcentaje_progreso: Decimal = Field(default=Decimal("0.0"))
    
    # Fechas
    fecha_inicio: Optional[date] = Field(default=None)
    fecha_estimada_fin: Optional[date] = Field(default=None)
    fecha_real_fin: Optional[date] = Field(default=None)
    
    # Auditoria
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)
    
    # Relaciones
    fase_actual: Optional[FaseDesarrollo] = Relationship(back_populates="desarrollos")
    etapa_actual: Optional[EtapaDesarrollo] = Relationship(back_populates="desarrollos")


# --- Schemas de Validacion ---

class FaseCrear(SQLModel):
    """Schema para crear una fase"""
    nombre: str
    codigo: str
    orden: int
    descripcion: Optional[str] = None
    color: str = "#3498db"
    esta_activa: bool = True


class EtapaCrear(SQLModel):
    """Schema para crear una etapa"""
    fase_id: int
    nombre: str
    codigo: str
    orden: int
    descripcion: Optional[str] = None
    duracion_estimada_dias: Optional[int] = None
    porcentaje_inicio: Decimal = Decimal("0.0")
    porcentaje_fin: Decimal = Decimal("100.0")
    esta_activa: bool = True


class DesarrolloCrear(SQLModel):
    """Schema para crear un desarrollo"""
    id: str
    nombre: str
    descripcion: Optional[str] = None
    modulo: Optional[str] = None
    tipo: Optional[str] = None
    ambiente: Optional[str] = None
    enlace_portal: Optional[str] = None
    proveedor: Optional[str] = None
    responsable: Optional[str] = None
    estado_general: str = "Pendiente"
    fase_actual_id: Optional[int] = None
    etapa_actual_id: Optional[int] = None
    porcentaje_progreso: Decimal = Decimal("0.0")
    fecha_inicio: Optional[date] = None
    fecha_estimada_fin: Optional[date] = None


class DesarrolloActualizar(SQLModel):
    """Schema para actualizar un desarrollo"""
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    modulo: Optional[str] = None
    tipo: Optional[str] = None
    ambiente: Optional[str] = None
    enlace_portal: Optional[str] = None
    proveedor: Optional[str] = None
    responsable: Optional[str] = None
    estado_general: Optional[str] = None
    fase_actual_id: Optional[int] = None
    etapa_actual_id: Optional[int] = None
    porcentaje_progreso: Optional[Decimal] = None
    fecha_inicio: Optional[date] = None
    fecha_estimada_fin: Optional[date] = None
    fecha_real_fin: Optional[date] = None
