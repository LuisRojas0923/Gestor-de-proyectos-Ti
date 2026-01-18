from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# Category Schemas
class TicketCategoryBase(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str] = None
    icono: Optional[str] = None
    tipo_formulario: str

class TicketCategoryCreate(TicketCategoryBase):
    pass

class TicketCategory(TicketCategoryBase):
    creado_en: datetime
    
    class Config:
        orm_mode = True

# Ticket Schemas
class SupportTicketBase(BaseModel):
    categoria_id: str
    asunto: str
    descripcion: str
    prioridad: str = "Media"
    
    # Datos del Solicitante
    creador_id: str
    nombre_creador: Optional[str] = None
    correo_creador: Optional[EmailStr] = None
    area_creador: Optional[str] = None
    cargo_creador: Optional[str] = None
    sede_creador: Optional[str] = None
    
    fecha_entrega_ideal: Optional[datetime] = None
    datos_extra: Optional[Dict[str, Any]] = None
    desarrollo_id: Optional[str] = None

class SupportTicketCreate(SupportTicketBase):
    pass

class SupportTicketUpdate(BaseModel):
    estado: Optional[str] = None
    prioridad: Optional[str] = None
    asignado_a: Optional[str] = None
    diagnostico: Optional[str] = None
    resolucion: Optional[str] = None
    notas: Optional[str] = None
    horas_tiempo_empleado: Optional[Decimal] = None
    fecha_cierre: Optional[datetime] = None
    datos_extra: Optional[Dict[str, Any]] = None
    desarrollo_id: Optional[str] = None

class SupportTicket(SupportTicketBase):
    id: str
    estado: str
    asignado_a: Optional[str]
    diagnostico: Optional[str]
    resolucion: Optional[str]
    notas: Optional[str]
    horas_tiempo_empleado: Optional[Decimal]
    desarrollo_id: Optional[str]
    resuelto_en: Optional[datetime]
    fecha_creacion: datetime
    fecha_cierre: Optional[datetime]
    creado_en: datetime
    actualizado_en: datetime
    
    class Config:
        orm_mode = True

# Comment Schemas
class TicketCommentBase(BaseModel):
    comentario: str
    es_interno: bool = False

class TicketCommentCreate(TicketCommentBase):
    ticket_id: str
    usuario_id: Optional[str] = None
    nombre_usuario: Optional[str] = None

class TicketComment(TicketCommentBase):
    id: int
    ticket_id: str
    usuario_id: Optional[str]
    nombre_usuario: Optional[str]
    creado_en: datetime
    
    class Config:
        orm_mode = True
