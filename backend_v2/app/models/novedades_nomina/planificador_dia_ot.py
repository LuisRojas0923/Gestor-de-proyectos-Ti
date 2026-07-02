"""Asignaciones OT/CC por empleado y dia del planificador semanal."""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class NominaPlanificadorDiaOt(SQLModel, table=True):
    """Distribucion local del turno de un dia entre combinaciones OT/CC."""
    __tablename__ = "nomina_planificador_dia_ot"

    id: Optional[int] = Field(default=None, primary_key=True)
    anio: int = Field(index=True)
    semana_iso: int = Field(index=True)
    cedula: str = Field(max_length=50, index=True)
    dia_semana: int = Field(ge=1, le=7, index=True)

    orden: str = Field(max_length=50, index=True)
    cc: Optional[str] = Field(default=None, max_length=50, index=True)
    scc: Optional[str] = Field(default=None, max_length=50)
    sub_indice: Optional[str] = Field(default=None, max_length=50)
    categoria_sub_indice: str = Field(max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    vr_contratado: Optional[float] = None

    horas: Optional[float] = None
    porcentaje: Optional[float] = None
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
