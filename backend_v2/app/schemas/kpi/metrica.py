"""
Schemas de KPI - Backend V2
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, date
from decimal import Decimal


class MetricaKpiBase(BaseModel):
    """Schema base para mtricas de KPI"""
    desarrollo_id: str
    tipo_metrica: str = Field(..., max_length=100)
    proveedor: Optional[str] = None
    periodo_inicio: Optional[date] = None
    periodo_fin: Optional[date] = None
    valor: Optional[Decimal] = None
    valor_objetivo: Optional[Decimal] = None
    calculado_por: Optional[str] = None


class MetricaKpi(MetricaKpiBase):
    """Schema completo de mtrica KPI"""
    id: int
    calculado_en: datetime
    creado_en: datetime

    class Config:
        from_attributes = True


class FuncionalidadBase(BaseModel):
    """Schema base para funcionalidades"""
    desarrollo_id: str
    nombre_funcionalidad: str = Field(..., max_length=255)
    codigo_funcionalidad: Optional[str] = None
    descripcion: Optional[str] = None
    estado: str = "pendiente"
    fecha_entrega: Optional[date] = None
    cantidad_defectos: int = 0
    nivel_complejidad: str = "media"
    horas_estimadas: Optional[Decimal] = None
    horas_reales: Optional[Decimal] = None


class Funcionalidad(FuncionalidadBase):
    """Schema completo de funcionalidad"""
    id: int
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


class HistorialEntregaBase(BaseModel):
    """Schema base para historial de entregas"""
    desarrollo_id: str
    version_entrega: Optional[str] = None
    tipo_entrega: Optional[str] = None
    fecha_entrega: Optional[date] = None
    estado_entrega: Optional[str] = None
    motivo_devolucion: Optional[str] = None
    cantidad_devoluciones: int = 0
    fecha_aprobacion: Optional[date] = None
    aprobado_por: Optional[str] = None
    puntaje_calidad: Optional[Decimal] = None
    defectos_reportados: int = 0
    defectos_resueltos: int = 0
    notas_entrega: Optional[str] = None


class HistorialEntrega(HistorialEntregaBase):
    """Schema completo de historial de entrega"""
    id: int
    creado_en: datetime

    class Config:
        from_attributes = True
