from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Numeric


class FacturaLineaDetalle(SQLModel, table=True):
    """
    Almacena cada fila cruda del Excel de factura Claro.
    Permite consultar los datos importados tal cual llegan del proveedor,
    antes de la agregación y dispersión.
    """
    __tablename__ = "facturas_lineas_detalle"

    id: Optional[int] = Field(default=None, primary_key=True)
    periodo: str = Field(index=True, description="Periodo de la factura (AAAAMM)")
    
    # Columnas crudas del Excel
    min: str = Field(index=True, description="Número de línea (MIN)")
    nombre: str = Field(default="", description="Nombre del titular según Claro")
    descripcion: str = Field(default="", description="Descripción del servicio")
    valor: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    iva: float = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    
    # Clasificación automática
    criterio: str = Field(default="OTROS", description="CARGO FIJO / ESPECIALES / OTROS")
    
    # Metadatos
    created_at: datetime = Field(default_factory=datetime.utcnow)
