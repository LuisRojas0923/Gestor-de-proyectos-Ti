"""Contrato de lectura tabular para cálculos de horas extras."""
from datetime import date
from typing import Optional

from sqlmodel import SQLModel


class CalculoPlanillaRead(SQLModel):
    fila_id: str
    calculo_id: int
    cedula: str
    empleado: Optional[str] = None
    salario: float
    base_hora: float
    aplica_he: bool
    empresa: Optional[str] = None
    sucursal: Optional[str] = None
    fecha: date
    ot_cc: Optional[str] = None
    sub_subc: Optional[str] = None
    especialidad_ot: Optional[str] = None
    cantidad: float = 1.0
    ubicacion: str = "CC"
    novedad: str
    cantidad_horas: float
    observaciones: Optional[str] = None
    responsable: Optional[str] = None
    encargados: Optional[str] = None
    cliente: Optional[str] = None
    costo_total: float = 0.0
    estado: str
