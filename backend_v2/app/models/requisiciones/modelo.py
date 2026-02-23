"""
Modelos de Requisiciones de Personal - Backend V2 (SQLModel)
"""
from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Text, BigInteger

class RequisicionPersonal(SQLModel, table=True):
    """Requisiciones de personal de la compañía"""
    __tablename__ = "requisiciones_personal"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
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
    
    # Auxilios
    auxilio_movilizacion: Optional[int] = Field(default=None, sa_column=Column(BigInteger))
    auxilio_alimentacion: Optional[int] = Field(default=None, sa_column=Column(BigInteger))
    auxilio_vivienda: Optional[int] = Field(default=None, sa_column=Column(BigInteger))
    
    # Metadatos
    estado: str = Field(default="Pendiente", max_length=50)
    id_creador: Optional[int] = Field(default=None)
    fecha_creacion: datetime = Field(
        default_factory=datetime.now,
        sa_column_kwargs={"server_default": "now()"}
    )
