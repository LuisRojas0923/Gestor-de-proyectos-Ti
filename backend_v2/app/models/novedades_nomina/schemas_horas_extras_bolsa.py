"""
Sprint S6 — Schemas para bolsa de horas desactivable.

Separado de ``schemas_horas_extras`` para mantener ese archivo bajo el
límite de 500 líneas del pre-commit.

Endpoints:
- GET /bolsa/estado-global       -> BolsaEstadoGlobalOut
- POST /bolsa/overrides-ot       -> BolsaOverrideOTOut (input: BolsaOverrideOTIn)
- DELETE /bolsa/overrides-ot/{id}
- PUT /admin/bolsa/global        -> input: BolsaGlobalConfigIn
"""
from datetime import datetime
from typing import Optional

from pydantic import ConfigDict, Field
from sqlmodel import SQLModel


class BolsaEstadoGlobalOut(SQLModel):
    bolsa_habilitada: bool
    fuente: str  # 'OVERRIDE_OT' | 'PARAMETRO_LEGAL' | 'DEFAULT'


class BolsaOverrideOTIn(SQLModel):
    ot_id: int
    bolsa_habilitada_override: bool
    motivo: str = Field(min_length=1, max_length=500)
    autorizado_por: str = Field(min_length=1, max_length=100)


class BolsaOverrideOTOut(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ot_id: int
    bolsa_habilitada_override: bool
    bolsa_habilitada_erp: bool
    motivo: str
    autorizado_por: str
    vigente_desde: datetime
    vigente_hasta: Optional[datetime] = None
    estado: str
    documento_soporte_url: Optional[str] = None
    creado_en: Optional[datetime] = None


class BolsaGlobalConfigIn(SQLModel):
    habilitada: bool
    justificacion: str = Field(min_length=1, max_length=500)
    autorizado_por: str = Field(min_length=1, max_length=100)
