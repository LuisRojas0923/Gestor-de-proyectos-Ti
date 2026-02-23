"""
Schemas de validación para Requisiciones de Personal
"""
from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

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

class RequisicionPublica(RequisicionBase):
    id: int
    estado: str
    fecha_creacion: datetime
    
    model_config = ConfigDict(from_attributes=True)
