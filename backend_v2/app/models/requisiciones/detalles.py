from typing import Optional, TYPE_CHECKING
from datetime import date
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .modelo import RequisicionPersonal

class RequisicionAgenciaDetalle(SQLModel, table=True):
    """Detalle de métricas por agencia (SUMMAR, MULTIEMPLEOS, DIRECTO)"""
    __tablename__ = "requisiciones_agencias_detalles"

    id: Optional[int] = Field(default=None, primary_key=True)
    requisicion_id: str = Field(foreign_key="requisiciones_personal.id")
    
    # Identificador de la agencia
    agencia: str = Field(max_length=50) # 'SUMMAR', 'MULTIEMPLEOS', 'DIRECTO'
    
    # Métricas
    fecha_envio_hv: Optional[date] = Field(default=None)
    na: int = Field(default=0)
    a: int = Field(default=0)
    cancel_tiempo: int = Field(default=0)
    cancel_referido: int = Field(default=0)
    cancel_mov: int = Field(default=0)
    nc_exp: int = Field(default=0)
    nc_em: int = Field(default=0)
    nc_entrev: int = Field(default=0)
    nc_antcd: int = Field(default=0)
    nc_vial: int = Field(default=0)
    
    # Adicionales
    salario_final: int = Field(default=0)
    tiempo: int = Field(default=0)
    tipo_contrato: Optional[str] = Field(default=None, max_length=150)
    tema_personal: int = Field(default=0)
    no_asistio_entrev: int = Field(default=0)
    contratado: int = Field(default=0)
    obs: Optional[str] = Field(default=None, sa_column_kwargs={"server_default": None})

    # Relación inversa
    requisicion: "RequisicionPersonal" = Relationship(back_populates="detalles_agencias")
