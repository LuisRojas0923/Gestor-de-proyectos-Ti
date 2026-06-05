"""
Schemas (Pydantic/SQLModel) para el módulo Requisición de Personal (RP).
Request y Response bodies de todos los endpoints.
"""
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, validator


# ──────────────────────────────────────────────
# Catálogos
# ──────────────────────────────────────────────
class AreaOut(BaseModel):
    id: int
    nombre: str
    activo: bool

    class Config:
        from_attributes = True


class CargoOut(BaseModel):
    id: int
    area_id: int
    cargo_superior_id: Optional[int] = None
    nombre: str
    activo: bool

    class Config:
        from_attributes = True


class CiudadOut(BaseModel):
    id: int
    nombre: str
    activo: bool

    class Config:
        from_attributes = True


class AprobadorOut(BaseModel):
    id: int
    area_id: int
    nombre_aprobador: str
    email_aprobador: str
    activo: bool

    class Config:
        from_attributes = True


class AprobadorCreate(BaseModel):
    area_id: int
    nombre_aprobador: str
    email_aprobador: EmailStr
    activo: bool = True


# ──────────────────────────────────────────────
# Requisición — Payload de creación/edición
# ──────────────────────────────────────────────
class RequisicionCreate(BaseModel):
    # Sección 1
    departamento: Optional[str] = None
    municipio: Optional[str] = None
    ot: Optional[str] = None
    nombre_obra_proyecto: Optional[str] = None
    direccion_obra_proyecto: Optional[str] = None
    encargado_sitio: Optional[str] = None
    numero_personas_requeridas: int = 1
    tsa: Optional[str] = None
    duracion_obra_contrato: Optional[str] = None
    fecha_probable_ingreso: Optional[date] = None
    centro_costo: Optional[str] = None
    perfil_requerido: Optional[str] = None

    # Sección 2
    area_id: Optional[int] = None
    cargo_id: Optional[int] = None

    # Sección 3
    causal_requisicion: Optional[str] = None
    otra_causal: Optional[str] = None
    aprobador_id: Optional[int] = None

    # Sección 4
    necesita_equipos_oficina: str = "NO"
    equipos_oficina: List[str] = []
    necesita_equipos_tecnologicos: str = "NO"
    equipos_tecnologicos: List[str] = []
    requiere_simcard: str = "NO"
    tipo_plan_simcard: Optional[str] = None
    requiere_programas_especiales: str = "NO"
    programas_especiales: Optional[str] = None

    # Sección 5
    salario_asignado: Optional[float] = None
    horas_extras: str = "NO"
    modalidad_contratacion: Optional[str] = None
    tipo_contratacion: Optional[str] = None
    auxilio_movilizacion: float = 0
    auxilio_alimentacion: float = 0
    auxilio_vivienda: float = 0

    @validator("fecha_probable_ingreso", pre=True, always=True)
    def fecha_no_puede_ser_pasada(cls, v):
        from datetime import date as dt_date, datetime as dt_datetime
        if isinstance(v, str) and v.strip():
            try:
                v = dt_datetime.strptime(v.strip(), "%Y-%m-%d").date()
            except ValueError:
                pass
        if v and isinstance(v, dt_date) and v < dt_date.today():
            raise ValueError("La fecha probable de ingreso no puede ser anterior a hoy")
        return v

    @validator("salario_asignado")
    def salario_positivo(cls, v):
        if v is not None and v < 0:
            raise ValueError("El salario no puede ser negativo")
        return v

    @validator("numero_personas_requeridas", pre=True)
    def validar_personas_requeridas(cls, v):
        if isinstance(v, bool):
            raise ValueError("El número de personas requeridas debe ser un número entero")
        if isinstance(v, float):
            raise ValueError("El número de personas requeridas debe ser un número entero")
        try:
            val = int(v)
        except (ValueError, TypeError):
            raise ValueError("El número de personas requeridas debe ser un número entero")
        if val < 1:
            raise ValueError("El número de personas requeridas debe ser mayor o igual a 1")
        return val


# ──────────────────────────────────────────────
# Requisición — Response
# ──────────────────────────────────────────────
class EquipoOut(BaseModel):
    id: int
    equipo: str

    class Config:
        from_attributes = True


class HistorialOut(BaseModel):
    id: int
    estado_anterior: Optional[str]
    estado_nuevo: str
    usuario_nombre: str
    usuario_email: str
    observacion: Optional[str]
    fecha_evento: Optional[datetime]

    class Config:
        from_attributes = True


class ComentarioOut(BaseModel):
    id: int
    usuario_nombre: str
    usuario_email: str
    comentario: str
    fecha_comentario: Optional[datetime]

    class Config:
        from_attributes = True


class RequisicionOut(BaseModel):
    id: int
    rp: Optional[str]
    estado: str
    correo_solicitante: str
    nombre_solicitante: str
    fecha_radicacion: Optional[datetime]
    departamento: Optional[str]
    municipio: Optional[str]
    ot: Optional[str]
    nombre_obra_proyecto: Optional[str]
    direccion_obra_proyecto: Optional[str]
    encargado_sitio: Optional[str]
    numero_personas_requeridas: int
    tsa: Optional[str]
    duracion_obra_contrato: Optional[str]
    fecha_probable_ingreso: Optional[date]
    centro_costo: Optional[str]
    perfil_requerido: Optional[str]
    area_id: Optional[int]
    area_nombre: Optional[str]
    cargo_id: Optional[int]
    cargo_nombre: Optional[str]
    causal_requisicion: Optional[str]
    otra_causal: Optional[str]
    aprobador_id: Optional[int]
    necesita_equipos_oficina: Optional[str]
    necesita_equipos_tecnologicos: Optional[str]
    requiere_simcard: Optional[str]
    tipo_plan_simcard: Optional[str]
    requiere_programas_especiales: Optional[str]
    programas_especiales: Optional[str]
    salario_asignado: Optional[float]
    horas_extras: Optional[str]
    modalidad_contratacion: Optional[str]
    tipo_contratacion: Optional[str]
    auxilio_movilizacion: Optional[float]
    auxilio_alimentacion: Optional[float]
    auxilio_vivienda: Optional[float]
    aprobador_nombre: Optional[str]
    aprobador_email: Optional[str]
    fecha_decision_aprobador: Optional[datetime]
    observacion_aprobador: Optional[str]
    gerente_nombre: Optional[str] = None
    gerente_email: Optional[str] = None
    fecha_decision_gerente: Optional[datetime] = None
    observacion_gerente: Optional[str] = None
    responsable_gh_nombre: Optional[str]
    responsable_gh_email: Optional[str]
    fecha_cierre: Optional[datetime]
    observacion_cierre: Optional[str]
    fecha_recibido_gh: Optional[datetime] = None
    modificada_por_gh: bool = False
    fecha_modificacion_gh: Optional[datetime] = None
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class RequisicionDetalle(RequisicionOut):
    equipos_oficina: List[EquipoOut] = []
    equipos_tecnologicos: List[EquipoOut] = []
    historial: List[HistorialOut] = []
    comentarios: List[ComentarioOut] = []


# ──────────────────────────────────────────────
# Payloads de acciones del aprobador
# ──────────────────────────────────────────────
class AprobarPayload(BaseModel):
    observacion: Optional[str] = None


class RechazarPayload(BaseModel):
    observacion: str  # OBLIGATORIO


class DevolverPayload(BaseModel):
    observacion: str  # OBLIGATORIO


# ──────────────────────────────────────────────
class CancelarGHPayload(BaseModel):
    observacion: str


# ──────────────────────────────────────────────
# Payload comentarios
# ──────────────────────────────────────────────
class ComentarioCreate(BaseModel):
    comentario: str


# ──────────────────────────────────────────────
# Seguimiento de Requisiciones (Gestión Humana)
# ──────────────────────────────────────────────
from typing import Dict

class EmpresaTemporalOut(BaseModel):
    id: int
    nombre: str
    activo: bool
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmpresaTemporalCreate(BaseModel):
    nombre: str


class EmpresaTemporalUpdate(BaseModel):
    nombre: str
    activo: bool


class RequisicionTemporalOut(BaseModel):
    requisicion_id: int
    temporal_id: int
    nombre_temporal: str
    fecha_envio: Optional[datetime] = None
    fecha_envio_hv: Optional[datetime] = None


class RequisicionTemporalAssignPayload(BaseModel):
    temporal_ids: List[int]


class RequisicionTemporalEnvioHVPayload(BaseModel):
    fecha_envio_hv: Optional[datetime] = None


class CandidatoRequisicionOut(BaseModel):
    id: int
    requisicion_id: int
    temporal_id: int
    nombre_temporal: Optional[str] = None
    nombre_candidato: str
    estado: str
    causal_descarte: Optional[str] = None
    observaciones: Optional[str] = None
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


class CandidatoRequisicionCreate(BaseModel):
    temporal_id: int
    nombre_candidato: str
    observaciones: Optional[str] = None


class CandidatoRequisicionUpdate(BaseModel):
    nombre_candidato: Optional[str] = None
    estado: Optional[str] = None
    causal_descarte: Optional[str] = None
    observaciones: Optional[str] = None


class SeguimientoStatsOut(BaseModel):
    total_hv: int
    aplica: int
    no_aplica: int
    contratados: int
    por_evaluar: int
    causales_descarte: Dict[str, int]


class CausalDescarteOut(BaseModel):
    id: int
    causal: str
    activo: bool
    creado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


class CausalDescarteCreate(BaseModel):
    causal: str


class CausalDescarteUpdate(BaseModel):
    causal: str
    activo: bool
