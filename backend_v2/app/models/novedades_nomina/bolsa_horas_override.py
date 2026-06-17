"""
Sprint S6 — Modelo del override por OT del flag global de bolsa de horas.

La decision por defecto vive en nomina_parametros_legales.BOLSA_GLOBAL_HABILITADA.
Este modelo guarda overrides por OT que tienen prioridad sobre el global,
siguiendo el mismo patron inmutable de NominaOverrideAutorizaHE.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class NominaBolsaOtOverride(SQLModel, table=True):
    """Bitacora inmutable de cada override de bolsa por OT.

    - bolsa_habilitada_erp: snapshot del parametro legal global al crear el
      override, para auditoria.
    - bolsa_habilitada_override: valor efectivo aplicado.
    - vigente_hasta + estado='REVOCADO' para cancelaciones (no se borra).
    """
    __tablename__ = "nomina_bolsa_ot_override"

    id: Optional[int] = Field(default=None, primary_key=True)
    ot_id: int = Field(index=True)

    bolsa_habilitada_override: bool
    bolsa_habilitada_erp: bool

    motivo: str = Field(max_length=500)
    autorizado_por: str = Field(max_length=100)
    autorizado_por_id: Optional[str] = Field(default=None, max_length=50)

    vigente_desde: datetime = Field(default_factory=datetime.now)
    vigente_hasta: Optional[datetime] = Field(default=None)
    estado: str = Field(default="ACTIVO", max_length=20)

    documento_soporte_url: Optional[str] = Field(default=None, max_length=500)
    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )
