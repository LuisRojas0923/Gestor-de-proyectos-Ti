from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
import uuid

class TransitoViatico(SQLModel, table=True):
    """Modelo para la tabla unica de transito de viaticos"""
    __tablename__ = "transito_viaticos"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    reporte_id: uuid.UUID = Field(index=True)
    estado: str = Field(default="PRE-INICIAL", max_length=50)
    fecha_registro: datetime = Field(default_factory=datetime.now)
    
    # Metadata del Empleado
    empleado_cedula: str = Field(max_length=50)
    empleado_nombre: Optional[str] = Field(default=None, max_length=255)
    area: Optional[str] = Field(default=None, max_length=255)
    cargo: Optional[str] = Field(default=None, max_length=255)
    ciudad: Optional[str] = Field(default=None, max_length=100)
    
    # Datos de la Línea de Gasto
    categoria: Optional[str] = Field(default=None, max_length=100)
    fecha_gasto: Optional[date] = Field(default=None)
    ot: Optional[str] = Field(default=None, max_length=50)
    cc: Optional[str] = Field(default=None, max_length=50)
    scc: Optional[str] = Field(default=None, max_length=50)
    valor_con_factura: float = Field(default=0.0)
    valor_sin_factura: float = Field(default=0.0)
    observaciones_linea: Optional[str] = Field(default=None)
    
    # Metadata del Reporte
    observaciones_gral: Optional[str] = Field(default=None)
    usuario_id: Optional[str] = Field(default=None, max_length=50)
    adjuntos: Optional[list] = Field(default=[], sa_column=Column(JSONB))
