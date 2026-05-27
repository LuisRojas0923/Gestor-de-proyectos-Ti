"""
Modelo principal de Requisición de Personal (RP) - Backend V2
Tabla: requisiciones_personal
Estados: BORRADOR, PENDIENTE_APROBACION, DEVUELTA_AJUSTE, APROBADA, RECHAZADA,
         EN_PROCESO_SELECCION, CANDIDATO_SELECCIONADO, EN_PROCESO_CONTRATACION,
         CERRADA, CANCELADA
"""
from typing import Optional
from datetime import date, datetime
from sqlmodel import SQLModel, Field, text


# ──────────────────────────────────────────────
# Constantes de Estado
# ──────────────────────────────────────────────
class EstadoRP:
    BORRADOR = "BORRADOR"
    PENDIENTE_APROBACION = "PENDIENTE_APROBACION"
    PENDIENTE_APROBACION_GERENCIA = "PENDIENTE_APROBACION_GERENCIA"
    DEVUELTA_AJUSTE = "DEVUELTA_AJUSTE"
    APROBADA = "APROBADA"
    RECHAZADA = "RECHAZADA"
    EN_PROCESO_SELECCION = "EN_PROCESO_SELECCION"
    CANDIDATO_SELECCIONADO = "CANDIDATO_SELECCIONADO"
    EN_PROCESO_CONTRATACION = "EN_PROCESO_CONTRATACION"
    CERRADA = "CERRADA"
    CANCELADA = "CANCELADA"

    LABELS = {
        BORRADOR: "Borrador",
        PENDIENTE_APROBACION: "Pendiente de Aprobación",
        PENDIENTE_APROBACION_GERENCIA: "Pendiente Aprobación Gerencia",
        DEVUELTA_AJUSTE: "Devuelta para Ajuste",
        APROBADA: "Aprobada",
        RECHAZADA: "Rechazada",
        EN_PROCESO_SELECCION: "En Proceso de Selección",
        CANDIDATO_SELECCIONADO: "Candidato Seleccionado",
        EN_PROCESO_CONTRATACION: "En Proceso de Contratación",
        CERRADA: "Cerrada",
        CANCELADA: "Cancelada",
    }

    # Transiciones permitidas por actor
    TRANSICIONES_GERENTE = {
        PENDIENTE_APROBACION: [PENDIENTE_APROBACION_GERENCIA, RECHAZADA, DEVUELTA_AJUSTE],
        PENDIENTE_APROBACION_GERENCIA: [APROBADA, RECHAZADA, DEVUELTA_AJUSTE],
    }
    TRANSICIONES_GH = {
        APROBADA: [EN_PROCESO_SELECCION, CANCELADA],
        EN_PROCESO_SELECCION: [CANDIDATO_SELECCIONADO, CANCELADA],
        CANDIDATO_SELECCIONADO: [EN_PROCESO_CONTRATACION, CANCELADA],
        EN_PROCESO_CONTRATACION: [CERRADA, CANCELADA],
    }


# ──────────────────────────────────────────────
# Modelo principal (tabla)
# ──────────────────────────────────────────────
class RequisicionPersonal(SQLModel, table=True):
    """Requisición de Personal — modelo completo"""
    __tablename__ = "requisiciones_personal"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Número RP generado automáticamente (ej: RP-0001)
    rp: Optional[str] = Field(default=None, max_length=20, unique=True, index=True)
    consecutivo: Optional[int] = Field(default=None)  # número entero base del RP

    # ── Sección 1: Datos Generales ──────────────
    correo_solicitante: str = Field(max_length=255)
    nombre_solicitante: str = Field(max_length=255)
    fecha_radicacion: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )
    ciudad_id: Optional[int] = Field(default=None, foreign_key="ciudades_rp.id")
    ciudad_nombre: Optional[str] = Field(default=None, max_length=100)  # desnorm. para historial
    ot: Optional[str] = Field(default=None, max_length=100)
    nombre_obra_proyecto: Optional[str] = Field(default=None, max_length=500)
    direccion_obra_proyecto: Optional[str] = Field(default=None, max_length=500)
    encargado_sitio: Optional[str] = Field(default=None, max_length=255)
    numero_personas_requeridas: int = Field(default=1)
    tsa: Optional[str] = Field(default=None, max_length=20)          # APLICA / NO APLICA
    duracion_obra_contrato: Optional[str] = Field(default=None, max_length=50)
    fecha_probable_ingreso: Optional[date] = Field(default=None)
    centro_costo: Optional[str] = Field(default=None, max_length=100)
    perfil_requerido: Optional[str] = Field(default=None)

    # ── Sección 2: Área y Cargo ──────────────────
    area_id: Optional[int] = Field(default=None, foreign_key="areas_rp.id")
    area_nombre: Optional[str] = Field(default=None, max_length=100)  # desnorm.
    cargo_id: Optional[int] = Field(default=None, foreign_key="cargos_rp.id")
    cargo_nombre: Optional[str] = Field(default=None, max_length=255)  # desnorm.

    # ── Sección 3: Causal ────────────────────────
    causal_requisicion: Optional[str] = Field(default=None, max_length=100)
    otra_causal: Optional[str] = Field(default=None)
    aprobador_id: Optional[int] = Field(default=None, foreign_key="aprobadores_area_rp.id")

    # ── Sección 4: Requisitos ────────────────────
    necesita_equipos_oficina: Optional[str] = Field(default="NO", max_length=3)
    necesita_equipos_tecnologicos: Optional[str] = Field(default="NO", max_length=3)
    requiere_simcard: Optional[str] = Field(default="NO", max_length=3)
    tipo_plan_simcard: Optional[str] = Field(default=None, max_length=50)
    requiere_programas_especiales: Optional[str] = Field(default="NO", max_length=3)
    programas_especiales: Optional[str] = Field(default=None)

    # ── Sección 5: Contratación ──────────────────
    salario_asignado: Optional[float] = Field(default=None)
    horas_extras: Optional[str] = Field(default="NO", max_length=3)
    modalidad_contratacion: Optional[str] = Field(default=None, max_length=100)
    tipo_contratacion: Optional[str] = Field(default=None, max_length=100)
    auxilio_movilizacion: Optional[float] = Field(default=0)
    auxilio_alimentacion: Optional[float] = Field(default=0)
    auxilio_vivienda: Optional[float] = Field(default=0)

    # ── Control de Flujo ─────────────────────────
    estado: str = Field(default=EstadoRP.BORRADOR, max_length=60)

    # Aprobador asignado
    aprobador_nombre: Optional[str] = Field(default=None, max_length=255)
    aprobador_email: Optional[str] = Field(default=None, max_length=255)
    fecha_decision_aprobador: Optional[datetime] = Field(default=None)
    observacion_aprobador: Optional[str] = Field(default=None)

    # Aprobador Gerencia
    gerente_nombre: Optional[str] = Field(default=None, max_length=255)
    gerente_email: Optional[str] = Field(default=None, max_length=255)
    fecha_decision_gerente: Optional[datetime] = Field(default=None)
    observacion_gerente: Optional[str] = Field(default=None)

    # Gestión Humana
    responsable_gh_nombre: Optional[str] = Field(default=None, max_length=255)
    responsable_gh_email: Optional[str] = Field(default=None, max_length=255)
    fecha_cierre: Optional[datetime] = Field(default=None)
    observacion_cierre: Optional[str] = Field(default=None)

    # Auditoría
    created_at: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": text("now()")}
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column_kwargs={"server_default": text("now()"), "onupdate": text("now()")}
    )
