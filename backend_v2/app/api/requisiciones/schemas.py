"""
Schemas de validación para Requisiciones de Personal
"""
from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, computed_field

class RequisicionBase(BaseModel):
    solicitante_nombre: str
    solicitante_area: str
    solicitante_sede: str
    solicitante_email: str
    ciudad_contratacion: str
    orden_trabajo: str
    nombre_proyecto: str
    direccion_proyecto: str
    encargado_sitio: str
    area_destino: str
    cargo_nombre: str
    numero_personas: int = 1
    trabajo_alturas: str
    duracion_contrato: str
    fecha_ingreso: date
    centro_costo: str
    causal_requisicion: str
    perfil_o: str
    equipos_oficina: str
    equipos_detalle: Optional[str] = None
    equipos_tecnologicos: str
    tecnologia_detalle: Optional[str] = None
    sim_card_requerida: str
    sim_card_plan: Optional[str] = None
    programas_especiales_requeridos: str
    programas_especiales_detalle: Optional[str] = None
    salario_asignado: int
    horas_extra: str
    modalidad_contratacion: str
    tipo_contratacion: str
    auxilio_movilizacion: Optional[int] = None
    auxilio_alimentacion: Optional[int] = None
    auxilio_vivienda: Optional[int] = None

class RequisicionCrear(RequisicionBase):
    pass

class RequisicionRevisionJefe(BaseModel):
    aprobado: bool
    comentario: Optional[str] = None

class RequisicionRevisionGH(BaseModel):
    aprobado: bool
    comentario: Optional[str] = None

class RequisicionPublica(RequisicionBase):
    id: str
    estado: str
    fecha_creacion: datetime
    id_creador: Optional[str] = None
    
    id_jefe_aprobador: Optional[str] = None
    nombre_jefe_aprobador: Optional[str] = None
    fecha_revision_jefe: Optional[datetime] = None
    comentario_revision_jefe: Optional[str] = None
    
    id_gh_aprobador: Optional[str] = None
    nombre_gh_aprobador: Optional[str] = None
    fecha_revision_gh: Optional[datetime] = None
    comentario_revision_gh: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
