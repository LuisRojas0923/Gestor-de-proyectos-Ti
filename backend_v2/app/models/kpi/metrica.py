"""
Modelos de KPI - Backend V2 (SQLModel)
"""
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from sqlmodel import SQLModel, Field


# --- Modelos de Base de Datos (table=True) ---

class MetricaKpi(SQLModel, table=True):
    """Metricas de KPI por desarrollo"""
    __tablename__ = "metricas_kpi"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    desarrollo_id: str = Field(max_length=50)
    tipo_metrica: str = Field(max_length=100)
    proveedor: Optional[str] = Field(default=None, max_length=100)
    periodo_inicio: Optional[date] = Field(default=None)
    periodo_fin: Optional[date] = Field(default=None)
    valor: Optional[Decimal] = Field(default=None)
    valor_objetivo: Optional[Decimal] = Field(default=None)
    calculado_por: Optional[str] = Field(default=None, max_length=255)
    calculado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


class Funcionalidad(SQLModel, table=True):
    """Funcionalidades de un desarrollo"""
    __tablename__ = "funcionalidades"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    desarrollo_id: str = Field(max_length=50)
    nombre_funcionalidad: str = Field(max_length=255)
    codigo_funcionalidad: Optional[str] = Field(default=None, max_length=100)
    descripcion: Optional[str] = Field(default=None)
    estado: str = Field(default="pendiente", max_length=50)
    fecha_entrega: Optional[date] = Field(default=None)
    cantidad_defectos: int = Field(default=0)
    nivel_complejidad: str = Field(default="media", max_length=20)
    horas_estimadas: Optional[Decimal] = Field(default=None)
    horas_reales: Optional[Decimal] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)


class HistorialEntrega(SQLModel, table=True):
    """Historial de entregas de un desarrollo"""
    __tablename__ = "historial_entregas"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    desarrollo_id: str = Field(max_length=50)
    version_entrega: Optional[str] = Field(default=None, max_length=50)
    tipo_entrega: Optional[str] = Field(default=None, max_length=50)
    fecha_entrega: Optional[date] = Field(default=None)
    estado_entrega: Optional[str] = Field(default=None, max_length=50)
    motivo_devolucion: Optional[str] = Field(default=None)
    cantidad_devoluciones: int = Field(default=0)
    fecha_aprobacion: Optional[date] = Field(default=None)
    aprobado_por: Optional[str] = Field(default=None, max_length=255)
    puntaje_calidad: Optional[Decimal] = Field(default=None)
    defectos_reportados: int = Field(default=0)
    defectos_resueltos: int = Field(default=0)
    notas_entrega: Optional[str] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


# --- Schemas de Validacion ---

class MetricaKpiCrear(SQLModel):
    """Schema para crear una metrica KPI"""
    desarrollo_id: str
    tipo_metrica: str
    proveedor: Optional[str] = None
    periodo_inicio: Optional[date] = None
    periodo_fin: Optional[date] = None
    valor: Optional[Decimal] = None
    valor_objetivo: Optional[Decimal] = None
    calculado_por: Optional[str] = None


class FuncionalidadCrear(SQLModel):
    """Schema para crear una funcionalidad"""
    desarrollo_id: str
    nombre_funcionalidad: str
    codigo_funcionalidad: Optional[str] = None
    descripcion: Optional[str] = None
    estado: str = "pendiente"
    fecha_entrega: Optional[date] = None
    cantidad_defectos: int = 0
    nivel_complejidad: str = "media"
    horas_estimadas: Optional[Decimal] = None
    horas_reales: Optional[Decimal] = None


class HistorialEntregaCrear(SQLModel):
    """Schema para crear un historial de entrega"""
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
