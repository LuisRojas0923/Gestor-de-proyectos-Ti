"""
Modelo NominaNovedadEvento (Sprint S5).

Extraído de `horas_extras.py` para mantener ese archivo bajo el límite
de 500 líneas (Architecture Enforcer).

Diferencia con horas extras:
  - Una novedad es un PERÍODO (rango de fechas) que afecta la liquidación
    de esos días (LIC, VAC, INC, AUS, PNR, RET, SAN, DXT).
  - Las horas extras son un CÁLCULO SEMANAL con horas_por_dia[].

Decisión S5: solo captura, sin integración con el motor de pre-liquidación
(esa pieza es S5b: cada categoría tiene reglas distintas — AUS=0h,
LIC=8h normales, PNR=0h, INC=prorrateo EPS/ARL, etc.).

Estado: BORRADOR → CONFIRMADO → ANULADO. CONFIRMADO es la fuente oficial
para integraciones posteriores; BORRADOR es editable; ANULADO requiere
justificación y es terminal.

Validaciones de negocio (en service):
  - codigo_novedad debe existir en nomina_catalogo_novedades
  - codigo_novedad.categoria ∈ {AUSENCIA, LICENCIA, VACACION, INCAPACIDAD}
  - empleado debe tener horario_pactado vigente
  - fecha_fin >= fecha_inicio
  - no solapamiento con evento activo (no ANULADO) del mismo codigo+cedula
"""
from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field


class NominaNovedadEvento(SQLModel, table=True):
    __tablename__ = "nomina_novedad_evento"

    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, index=True)
    codigo_novedad: str = Field(
        max_length=20,
        foreign_key="nomina_catalogo_novedades.codigo",
        index=True,
    )
    fecha_inicio: date
    fecha_fin: date
    observaciones: Optional[str] = Field(default=None, max_length=500)
    estado: str = Field(max_length=20, default="BORRADOR", index=True)
    created_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    created_by: Optional[str] = Field(default=None, max_length=50)
    updated_at: Optional[datetime] = Field(default=None)
    updated_by: Optional[str] = Field(default=None, max_length=50)
    confirmado_at: Optional[datetime] = Field(default=None)
    confirmado_by: Optional[str] = Field(default=None, max_length=50)
    anulado_at: Optional[datetime] = Field(default=None)
    anulado_justificacion: Optional[str] = Field(default=None, max_length=500)
