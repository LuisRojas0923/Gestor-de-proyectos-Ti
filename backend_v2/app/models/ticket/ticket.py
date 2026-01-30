"""
Modelos de Tickets - Backend V2 (SQLModel)
Unifica modelos y schemas en una sola definicion
"""
from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal
from pydantic import field_validator
from sqlmodel import SQLModel, Field, Relationship, JSON
from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import JSONB


# --- Modelos de Base de Datos (table=True) ---

class CategoriaTicket(SQLModel, table=True):
    """Categorias de tickets de soporte"""
    __tablename__ = "categorias_ticket"
    
    id: str = Field(primary_key=True, max_length=50)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = Field(default=None)
    icono: Optional[str] = Field(default=None, max_length=50)
    tipo_formulario: str = Field(max_length=50)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    # Relaciones
    tickets: List["Ticket"] = Relationship(back_populates="categoria")


class Ticket(SQLModel, table=True):
    """Tickets de soporte"""
    __tablename__ = "tickets"
    
    id: str = Field(primary_key=True, max_length=50)
    categoria_id: str = Field(foreign_key="categorias_ticket.id", max_length=50)
    asunto: str = Field(max_length=255)
    descripcion: str
    prioridad: str = Field(default="Media", max_length=20)
    estado: str = Field(default="Abierto", max_length=50)
    
    # Datos del solicitante
    creador_id: str = Field(max_length=50)
    nombre_creador: Optional[str] = Field(default=None, max_length=255)
    correo_creador: Optional[str] = Field(default=None, max_length=255)
    area_creador: Optional[str] = Field(default=None, max_length=100)
    cargo_creador: Optional[str] = Field(default=None, max_length=100)
    sede_creador: Optional[str] = Field(default=None, max_length=100)
    
    # Asignacion y resolucion
    asignado_a: Optional[str] = Field(default=None, max_length=255)
    diagnostico: Optional[str] = Field(default=None)
    resolucion: Optional[str] = Field(default=None)
    causa_novedad: Optional[str] = Field(default=None, max_length=100)
    notas: Optional[str] = Field(default=None)
    horas_tiempo_empleado: Optional[Decimal] = Field(default=None)
    
    # Datos adicionales
    desarrollo_id: Optional[str] = Field(default=None, max_length=50)  # FK removida - tabla no existe
    datos_extra: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    areas_impactadas: Optional[List[str]] = Field(default=None, sa_column=Column(JSONB)) # Almacenado como lista JSON

    
    # Fechas
    fecha_entrega_ideal: Optional[datetime] = Field(default=None)
    fecha_creacion: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    fecha_cierre: Optional[datetime] = Field(default=None)
    resuelto_en: Optional[datetime] = Field(default=None)
    atendido_en: Optional[datetime] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)
    
    # Relaciones
    categoria: Optional[CategoriaTicket] = Relationship(back_populates="tickets")
    comentarios: List["ComentarioTicket"] = Relationship(back_populates="ticket")
    historial: List["HistorialTicket"] = Relationship(back_populates="ticket", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    adjuntos: List["AdjuntoTicket"] = Relationship(back_populates="ticket", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    solicitud_desarrollo: Optional["SolicitudDesarrollo"] = Relationship(back_populates="ticket", sa_relationship_kwargs={"uselist": False})
    control_cambios: Optional["ControlCambios"] = Relationship(back_populates="ticket", sa_relationship_kwargs={"uselist": False})
    solicitud_activo: Optional["SolicitudActivo"] = Relationship(back_populates="ticket", sa_relationship_kwargs={"uselist": False})


class SolicitudDesarrollo(SQLModel, table=True):
    """Detalle para solicitudes de desarrollo"""
    __tablename__ = "solicitudes_desarrollo"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: str = Field(foreign_key="tickets.id", max_length=50)
    que_necesita: Optional[str] = Field(default=None)
    porque: Optional[str] = Field(default=None)
    paraque: Optional[str] = Field(default=None)
    justificacion_ia: Optional[str] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    ticket: Optional[Ticket] = Relationship(back_populates="solicitud_desarrollo")


class ControlCambios(SQLModel, table=True):
    """Solicitudes de cambio con campos estructurados individualmente"""
    __tablename__ = "control_cambios"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: str = Field(foreign_key="tickets.id", max_length=50)
    desarrollo_id: Optional[str] = Field(foreign_key="desarrollos.id", max_length=50)
    modulo_solid_id: Optional[int] = Field(default=None, foreign_key="solid_modulos.id")
    componente_solid_id: Optional[int] = Field(default=None, foreign_key="solid_componentes.id")
    
    # Clasificación precisa requerida por el usuario
    tipo_objeto: Optional[str] = Field(default=None, max_length=50) # Retrocompatibilidad
    accion_requerida: str = Field(max_length=50) # Corregir, Agregar, etc.
    
    # Datos técnicos individuales
    impacto_operativo: str = Field(default="Bajo", max_length=20)
    justificacion: str = Field(sa_column=Column(Text))
    descripcion_cambio: str = Field(sa_column=Column(Text))
    # fecha_sugerida eliminada por redundancia con fecha_entrega_ideal del Ticket
    
    ticket: Optional[Ticket] = Relationship(back_populates="control_cambios")


class SolicitudActivo(SQLModel, table=True):
    """Detalle para solicitudes de activos (Hardware, Software, Licencias)"""
    __tablename__ = "solicitudes_activo"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: str = Field(foreign_key="tickets.id", max_length=50)
    item_solicitado: str = Field(max_length=255) # E.g., "Mouse ergonómico", "Licencia Office"
    especificaciones: Optional[str] = Field(default=None, sa_column=Column(Text))
    cantidad: int = Field(default=1)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    ticket: Optional[Ticket] = Relationship(back_populates="solicitud_activo")


class ComentarioTicket(SQLModel, table=True):
    """Comentarios en tickets"""
    __tablename__ = "comentarios_ticket"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: str = Field(foreign_key="tickets.id", max_length=50)
    comentario: str
    es_interno: bool = Field(default=False)
    usuario_id: Optional[str] = Field(default=None, max_length=50)
    nombre_usuario: Optional[str] = Field(default=None, max_length=255)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    ticket: Optional[Ticket] = Relationship(back_populates="comentarios")


class HistorialTicket(SQLModel, table=True):
    """Logs de actividad de tickets"""
    __tablename__ = "historial_ticket"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: str = Field(foreign_key="tickets.id", max_length=50)
    usuario_id: Optional[str] = Field(default=None, max_length=50)
    nombre_usuario: Optional[str] = Field(default=None, max_length=255)
    accion: str = Field(max_length=100)
    detalle: Optional[str] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    ticket: Optional[Ticket] = Relationship(back_populates="historial")


class AdjuntoTicket(SQLModel, table=True):
    """Archivos adjuntos en formato Base64"""
    __tablename__ = "adjuntos_ticket"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: str = Field(foreign_key="tickets.id", max_length=50)
    nombre_archivo: str = Field(max_length=255)
    contenido_base64: str
    tipo_mime: Optional[str] = Field(default=None, max_length=100)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    ticket: Optional[Ticket] = Relationship(back_populates="adjuntos")


class SolicitudActivoPublico(SQLModel):
    """Schema publico para solicitud de activos"""
    id: int
    item_solicitado: str
    especificaciones: Optional[str] = None
    cantidad: int
    creado_en: datetime


# --- Schemas de Validacion (table=False) ---

class TicketBase(SQLModel):
    """Schema base para ticket"""
    categoria_id: str
    asunto: str
    descripcion: str
    prioridad: str = "Media"
    estado: str = "Abierto"
    creador_id: str
    nombre_creador: Optional[str] = None
    correo_creador: Optional[str] = None
    area_creador: Optional[str] = None
    cargo_creador: Optional[str] = None
    sede_creador: Optional[str] = None
    causa_novedad: Optional[str] = None
    datos_extra: Optional[dict] = None
    areas_impactadas: List[str] = Field(default=[]) # Siempre lista, incluso si entra None

    @field_validator("areas_impactadas", mode="before")
    @classmethod
    def validate_areas_impactadas(cls, v: Any) -> Any:
        if v is None:
            return []
        return v


class TicketCrear(TicketBase):
    """Schema para crear un ticket"""
    id: Optional[str] = None
    que_necesita: Optional[str] = None
    porque: Optional[str] = None
    paraque: Optional[str] = None
    justificacion_ia: Optional[str] = None
    
    # Campos para Control de Cambios
    desarrollo_id: Optional[str] = None
    modulo_solid_id: Optional[int] = None
    tipo_objeto: Optional[str] = None
    accion_requerida: Optional[str] = None
    impacto_operativo: Optional[str] = None
    justificacion_cambio: Optional[str] = None
    descripcion_cambio: Optional[str] = None
    componente_solid_id: Optional[int] = None

    # Campos para Solicitud de Activo
    item_solicitado: Optional[str] = None
    especificaciones: Optional[str] = None
    cantidad: Optional[int] = 1


class TicketActualizar(SQLModel):
    """Schema para actualizar un ticket"""
    asunto: Optional[str] = None
    descripcion: Optional[str] = None
    prioridad: Optional[str] = None
    estado: Optional[str] = None
    asignado_a: Optional[str] = None
    diagnostico: Optional[str] = None
    resolucion: Optional[str] = None
    causa_novedad: Optional[str] = None
    notas: Optional[str] = None
    horas_tiempo_empleado: Optional[Decimal] = None
    usuario_id: Optional[str] = None
    usuario_nombre: Optional[str] = None


class TicketPublico(TicketBase):
    """Schema publico de ticket (respuesta)"""
    id: str
    asignado_a: Optional[str] = None
    diagnostico: Optional[str] = None
    resolucion: Optional[str] = None
    causa_novedad: Optional[str] = None
    notas: Optional[str] = None
    horas_tiempo_empleado: Optional[Decimal] = None
    fecha_entrega_ideal: Optional[datetime] = None
    fecha_creacion: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    resuelto_en: Optional[datetime] = None
    atendido_en: Optional[datetime] = None
    creado_en: Optional[datetime] = None
    actualizado_en: Optional[datetime] = None
    
    # Datos de extension
    solicitud_activo: Optional[SolicitudActivoPublico] = None
    # Podriamos añadir los demas si fuera necesario:
    # solicitud_desarrollo: Optional[Any] = None
    # control_cambios: Optional[Any] = None


class ComentarioCrear(SQLModel):
    """Schema para crear un comentario"""
    comentario: str
    es_interno: bool = False
    usuario_id: Optional[str] = None
    nombre_usuario: Optional[str] = None


class AdjuntoCrear(SQLModel):
    """Schema para crear un adjunto"""
    ticket_id: str
    nombre_archivo: str
    contenido_base64: str
    tipo_mime: Optional[str] = None
