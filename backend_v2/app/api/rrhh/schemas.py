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
    ciudad_id: Optional[int] = None
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
    ciudad_id: Optional[int]
    ciudad_nombre: Optional[str]
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
    responsable_gh_nombre: Optional[str]
    responsable_gh_email: Optional[str]
    fecha_cierre: Optional[datetime]
    observacion_cierre: Optional[str]
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
# Payload Gestión Humana
# ──────────────────────────────────────────────
class ActualizarEstadoGHPayload(BaseModel):
    nuevo_estado: str
    observacion: Optional[str] = None


# ──────────────────────────────────────────────
# Payload comentarios
# ──────────────────────────────────────────────
class ComentarioCreate(BaseModel):
    comentario: str
