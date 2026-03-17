from typing import Optional, TYPE_CHECKING
from datetime import datetime, date
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Text, BigInteger, func

if TYPE_CHECKING:
    from .detalles import RequisicionAgenciaDetalle

class RequisicionPersonal(SQLModel, table=True):
    """Requisiciones de personal de la compañía"""
    __tablename__ = "requisiciones_personal"
    
    id: Optional[str] = Field(default=None, primary_key=True, max_length=50)
    
    # Información del Solicitante
    solicitante_nombre: str = Field(max_length=255)
    solicitante_area: str = Field(max_length=100)
    solicitante_sede: str = Field(max_length=100)
    solicitante_email: str = Field(max_length=255)
    
    # Información de la Orden
    ciudad_contratacion: str = Field(max_length=100)
    orden_trabajo: str = Field(max_length=50)
    nombre_proyecto: str = Field(max_length=255)
    direccion_proyecto: str = Field(max_length=255)
    encargado_sitio: str = Field(max_length=255)
    
    # Información de la Vacante
    area_destino: str = Field(max_length=100)
    cargo_nombre: str = Field(max_length=150)
    numero_personas: int = Field(default=1)
    trabajo_alturas: str = Field(max_length=20) # 'aplica', 'no_aplica'
    duracion_contrato: str = Field(max_length=50)
    fecha_ingreso: date
    centro_costo: str = Field(max_length=50)
    
    # Perfil
    causal_requisicion: str = Field(max_length=100)
    perfil_o: str = Field(sa_column=Column(Text))
    
    # Requisitos Generales
    equipos_oficina: str = Field(max_length=2) # 'si', 'no'
    equipos_detalle: Optional[str] = Field(default=None, sa_column=Column(Text))
    equipos_tecnologicos: str = Field(max_length=2)
    tecnologia_detalle: Optional[str] = Field(default=None, sa_column=Column(Text))
    sim_card_requerida: str = Field(max_length=2)
    sim_card_plan: Optional[str] = Field(default=None, max_length=100)
    programas_especiales_requeridos: str = Field(max_length=2)
    programas_especiales_detalle: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # Condiciones de Contratación
    salario_asignado: int = Field(sa_column=Column(BigInteger))
    horas_extra: str = Field(max_length=2)
    modalidad_contratacion: str = Field(max_length=100)
    tipo_contratacion: str = Field(max_length=100)
    
    # Auxilios y Mejoras
    auxilio_movilizacion: Optional[int] = Field(default=None, sa_column=Column(BigInteger))
    auxilio_alimentacion: Optional[int] = Field(default=None, sa_column=Column(BigInteger))
    auxilio_vivienda: Optional[int] = Field(default=None, sa_column=Column(BigInteger))
    
    # Seguimiento Centralizado GH
    fecha_recibo_gh: Optional[date] = Field(default=None)
    estado_rp: Optional[str] = Field(default="EN PROCESO", max_length=50) # EN PROCESO, FINALIZADA, CANCELADA
    
    # Control de Temporales Centralizado
    mejora: Optional[float] = Field(default=0.0)
    fecha_env_temporal: Optional[date] = Field(default=None)
    

    unidad_negocio: Optional[str] = Field(default=None, max_length=100)
    
    # Metadatos y Auditoría
    estado: str = Field(default="Pendiente de Jefe", max_length=50) # Pendiente de Jefe, Pendiente de GH, Aprobada, Rechazada
    id_creador: Optional[str] = Field(default=None, max_length=50)
    fecha_creacion: datetime = Field(
        sa_column_kwargs={"server_default": func.now()}
    )
    
    # Aprobación Nivel 1 (Jefe de Área)
    id_jefe_aprobador: Optional[str] = Field(default=None, max_length=50)
    nombre_jefe_aprobador: Optional[str] = Field(default=None, max_length=255)
    fecha_revision_jefe: Optional[datetime] = Field(default=None)
    comentario_revision_jefe: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # Aprobación Nivel 2 (Gestión Humana)
    id_gh_aprobador: Optional[str] = Field(default=None, max_length=50)
    nombre_gh_aprobador: Optional[str] = Field(default=None, max_length=255)
    fecha_revision_gh: Optional[datetime] = Field(default=None)
    comentario_revision_gh: Optional[str] = Field(default=None, sa_column=Column(Text))

    # Relación con Detalles de Agencias (Multi-fila)
    detalles_agencias: list["RequisicionAgenciaDetalle"] = Relationship(
        back_populates="requisicion", 
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

from .detalles import RequisicionAgenciaDetalle