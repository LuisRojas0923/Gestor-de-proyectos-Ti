"""
Modelos de base de datos para el seguimiento de requisiciones y candidatos por Gestión Humana.
Tablas: empresas_temporales, requisiciones_temporales, candidatos_requisicion
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class EmpresaTemporal(SQLModel, table=True):
    """Catálogo de empresas temporales / contratantes directos"""
    __tablename__ = "empresas_temporales"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=255, unique=True, index=True)
    activo: bool = Field(default=True, sa_column_kwargs={"server_default": "true"})
    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )


class RequisicionTemporal(SQLModel, table=True):
    """Relación de asignación de requisiciones a empresas temporales"""
    __tablename__ = "requisiciones_temporales"

    requisicion_id: int = Field(primary_key=True, foreign_key="requisiciones_personal.id")
    temporal_id: int = Field(primary_key=True, foreign_key="empresas_temporales.id")
    fecha_envio: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )
    fecha_envio_hv: Optional[datetime] = Field(default=None)


class CandidatoRequisicion(SQLModel, table=True):
    """Pipeline de candidatos remitidos por las temporales o directos"""
    __tablename__ = "candidatos_requisicion"

    id: Optional[int] = Field(default=None, primary_key=True)
    requisicion_id: int = Field(foreign_key="requisiciones_personal.id", index=True)
    temporal_id: int = Field(foreign_key="empresas_temporales.id")
    nombre_candidato: str = Field(max_length=255)
    cedula: Optional[str] = Field(default=None, max_length=20)
    estado: str = Field(default="POR_EVALUAR", max_length=50, index=True)
    causal_descarte: Optional[str] = Field(default=None, max_length=255)
    observaciones: Optional[str] = Field(default=None)
    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )
