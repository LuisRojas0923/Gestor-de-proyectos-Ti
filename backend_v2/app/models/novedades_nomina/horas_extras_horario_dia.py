"""
Modelo NominaHorarioPactadoDia (Sprint S5'').

Detalle diario del horario pactado del empleado: una fila por (cedula, dia_semana).
Permite capturar hora_entrada, hora_salida y minutos_almuerzo por día de la semana
(Lun=1 ... Dom=7). Es la fuente de verdad del horario del contrato y la entrada
natural para el formulario de pre-liquidación (S5'' UX): el usuario teclea las
horas de entrada/salida reales y el sistema deriva las horas trabajadas y las
horas extras.

Decisión:
  - PK compuesta (cedula, dia_semana) → una fila por día, sin duplicados.
  - hora_entrada / hora_salida son NULL cuando el día es libre (sábado/domingo
    o franco compensatorio). El cálculo los trata como 0h trabajadas.
  - minutos_almuerzo default 0; rango válido 0..240 (4h).
  - FK a nomina_horario_pactado.cedula con ON DELETE CASCADE para que al
    refrescar el cache desde el ERP, el detalle se borre junto con el padre.
"""
from typing import Optional
from datetime import time
from sqlmodel import SQLModel, Field


class NominaHorarioPactadoDia(SQLModel, table=True):
    __tablename__ = "nomina_horario_pactado_dia"

    cedula: str = Field(
        max_length=50,
        foreign_key="nomina_horario_pactado.cedula",
        primary_key=True,
    )
    dia_semana: int = Field(ge=1, le=7, primary_key=True)  # 1=Lun ... 7=Dom
    hora_entrada: Optional[time] = Field(default=None)
    hora_salida: Optional[time] = Field(default=None)
    minutos_almuerzo: int = Field(default=0, ge=0, le=240)
