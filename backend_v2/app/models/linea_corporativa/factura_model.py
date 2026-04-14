from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Numeric

class FacturaLinea(SQLModel, table=True):
    """
    Modelo para almacenar el resultado de la dispersión de una factura mensual
    para una línea específica. Permite mantener el historial y generar reportes por C.O.
    """
    __tablename__ = "facturas_lineas"

    id: Optional[int] = Field(default=None, primary_key=True)
    linea_id: int = Field(foreign_key="lineas_corporativas.id", index=True)
    periodo: str = Field(index=True, description="Año y Mes del cobro (ej: 202604)")
    
    # Datos de la persona y C.O al momento de la factura (Snapshot)
    documento_asignado: str = Field(index=True)
    centro_costo: str = Field(index=True)
    
    # Valores extraídos de la factura o calculados
    cargo_mes: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    descuento_mes: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    impoconsumo: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    descuento_iva: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    iva_19: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    total: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    
    # Resultados de la dispersión (lo que paga cada uno)
    pago_empleado: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    pago_refridcol: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    
    # Metadatos
    created_at: datetime = Field(default_factory=datetime.utcnow)
