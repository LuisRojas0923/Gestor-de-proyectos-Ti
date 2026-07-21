from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class EstadoPerfilERP(str, Enum):
    ENCONTRADO_ACTIVO = "encontrado_activo"
    SIN_CONTRATO_ACTIVO = "sin_contrato_activo"
    NO_ENCONTRADO = "no_encontrado_erp"


class PerfilLaboralERP(BaseModel):
    cedula: str
    nombre: Optional[str] = None
    cargo: Optional[str] = None
    area: Optional[str] = None
    sede: Optional[str] = None
    centrocosto: Optional[str] = None
    viaticante: Any = None
    baseviaticos: Any = None
    correo: Optional[str] = None


class ResultadoPerfilERP(BaseModel):
    estado: EstadoPerfilERP
    perfil: Optional[PerfilLaboralERP] = None
    cantidad_contratos_activos: int = 0


class EstadoSincronizacion(str, Enum):
    ACTUALIZADO = "actualizado"
    SIN_CAMBIOS = "sin_cambios"
    NO_ENCONTRADO = "no_encontrado_erp"
    SIN_CONTRATO_ACTIVO = "sin_contrato_activo"
    DATO_ERP_INVALIDO = "dato_erp_invalido"
    FALLIDO = "fallido"


class EstadoEjecucion(str, Enum):
    COMPLETO = "completo"
    PARCIAL = "parcial"
    PARCIAL_TIMEOUT = "parcial_timeout"


class ResultadoSincronizacionPerfil(BaseModel):
    estado: EstadoSincronizacion
    campos_modificados: list[str] = Field(default_factory=list)
    advertencias: list[str] = Field(default_factory=list)


class ResumenSincronizacionPerfiles(BaseModel):
    estado_general: EstadoEjecucion
    evaluados: int = 0
    actualizados: int = 0
    sin_cambios: int = 0
    no_sincronizables: int = 0
    fallidos: int = 0
    lotes_completados: int = 0
    lotes_fallidos: int = 0
    frecuencia_campos: dict[str, int] = Field(default_factory=dict)
    duracion_ms: int = 0


class SolicitudSincronizacionIndividual(BaseModel):
    model_config = ConfigDict(extra="forbid")

    usuario_id: str = Field(
        min_length=1,
        max_length=50,
        pattern=r"^[A-Za-z0-9_-]+$",
    )
