"""
Schemas de Desarrollo - Backend V2
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, date
from decimal import Decimal


class FaseBase(BaseModel):
    """Schema base para fase de desarrollo"""
    nombre: str = Field(..., max_length=100)
    codigo: str = Field(..., max_length=20)
    orden: int
    descripcion: Optional[str] = None
    color: str = "#3498db"
    esta_activa: bool = True


class EtapaBase(BaseModel):
    """Schema base para etapa de desarrollo"""
    fase_id: int
    nombre: str = Field(..., max_length=100)
    codigo: str = Field(..., max_length=20)
    orden: int
    descripcion: Optional[str] = None
    duracion_estimada_dias: Optional[int] = None
    porcentaje_inicio: Decimal = Decimal("0.0")
    porcentaje_fin: Decimal = Decimal("100.0")
    esta_activa: bool = True


class DesarrolloBase(BaseModel):
    """Schema base para desarrollo"""
    id: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=255)
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


class DesarrolloCrear(DesarrolloBase):
    """Schema para crear un desarrollo"""
    pass


class DesarrolloActualizar(BaseModel):
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


class Desarrollo(DesarrolloBase):
    """Schema completo de desarrollo (respuesta)"""
    fecha_real_fin: Optional[date] = None
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True
