"""
Schemas de Tickets - Backend V2
"""
from typing import Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class CategoriaTicketBase(BaseModel):
    """Schema base para categora de ticket"""
    id: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None
    icono: Optional[str] = None
    tipo_formulario: str = Field(..., max_length=50)


class CategoriaTicket(CategoriaTicketBase):
    """Schema completo de categora de ticket"""
    creado_en: datetime

    class Config:
        from_attributes = True


class TicketBase(BaseModel):
    """Schema base para ticket"""
    categoria_id: str
    asunto: str = Field(..., max_length=255)
    descripcion: str
    prioridad: str = "Media"
    estado: str = "Nuevo"
    creador_id: str
    nombre_creador: Optional[str] = None
    correo_creador: Optional[str] = None
    area_creador: Optional[str] = None
    cargo_creador: Optional[str] = None
    sede_creador: Optional[str] = None
    desarrollo_id: Optional[str] = None
    datos_extra: Optional[Any] = None
    fecha_entrega_ideal: Optional[datetime] = None


class TicketCrear(TicketBase):
    """Schema para crear un ticket"""
    id: str = Field(..., max_length=50)
    
    # Campos para solicitudes de desarrollo (opcionales)
    que_necesita: Optional[str] = None
    porque: Optional[str] = None
    paraque: Optional[str] = None
    justificacion_ia: Optional[str] = None


class TicketActualizar(BaseModel):
    """Schema para actualizar un ticket"""
    prioridad: Optional[str] = None
    estado: Optional[str] = None
    asignado_a: Optional[str] = None
    diagnostico: Optional[str] = None
    resolucion: Optional[str] = None
    notas: Optional[str] = None
    horas_tiempo_empleado: Optional[Decimal] = None
    fecha_cierre: Optional[datetime] = None
    resuelto_en: Optional[datetime] = None


class Ticket(TicketBase):
    """Schema completo de ticket (respuesta)"""
    id: str
    asignado_a: Optional[str] = None
    diagnostico: Optional[str] = None
    resolucion: Optional[str] = None
    notas: Optional[str] = None
    horas_tiempo_empleado: Optional[Decimal] = None
    fecha_creacion: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    resuelto_en: Optional[datetime] = None
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


class ComentarioTicketBase(BaseModel):
    """Schema base para comentario de ticket"""
    ticket_id: str
    comentario: str
    es_interno: bool = False
    usuario_id: Optional[str] = None
    nombre_usuario: Optional[str] = None


class ComentarioTicket(ComentarioTicketBase):
    """Schema completo de comentario"""
    id: int
    creado_en: datetime

    class Config:
        from_attributes = True


class HistorialTicketBase(BaseModel):
    """Schema base para historial de ticket"""
    ticket_id: str
    usuario_id: Optional[str] = None
    nombre_usuario: Optional[str] = None
    accion: str
    detalle: Optional[str] = None


class HistorialTicket(HistorialTicketBase):
    """Schema completo de historial"""
    id: int
    creado_en: datetime

    class Config:
        from_attributes = True


class AdjuntoTicketBase(BaseModel):
    """Schema base para adjunto de ticket"""
    ticket_id: str
    nombre_archivo: str
    tipo_mime: Optional[str] = None


class AdjuntoTicketCrear(AdjuntoTicketBase):
    """Schema para crear un adjunto (con Base64)"""
    contenido_base64: str


class AdjuntoTicket(AdjuntoTicketBase):
    """Schema para respuesta de adjunto (sin el base64 pesado a menos que se pida)"""
    id: int
    creado_en: datetime

    class Config:
        from_attributes = True


class AdjuntoTicketCompleto(AdjuntoTicket):
    """Schema detallado con el contenido binario/base64"""
    contenido_base64: str
