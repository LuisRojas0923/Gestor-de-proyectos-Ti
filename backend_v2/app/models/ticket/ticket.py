"""
Modelos de Tickets - Backend V2
"""
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Boolean, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base


class CategoriaTicket(Base):
    """Categorias de tickets de soporte"""
    __tablename__ = "categorias_ticket"
    
    id = Column(String(50), primary_key=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    icono = Column(String(50))
    tipo_formulario = Column(String(50), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    tickets = relationship("Ticket", back_populates="categoria")


class Ticket(Base):
    """Tickets de soporte"""
    __tablename__ = "tickets"
    
    id = Column(String(50), primary_key=True)
    categoria_id = Column(String(50), ForeignKey("categorias_ticket.id"), nullable=False)
    asunto = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=False)
    prioridad = Column(String(20), default="Media")
    estado = Column(String(50), default="Nuevo")
    
    # Datos del solicitante
    creador_id = Column(String(50), nullable=False)
    nombre_creador = Column(String(255))
    correo_creador = Column(String(255))
    area_creador = Column(String(100))
    cargo_creador = Column(String(100))
    sede_creador = Column(String(100))
    
    # Asignacion y resolucion
    asignado_a = Column(String(255))
    diagnostico = Column(Text)
    resolucion = Column(Text)
    notas = Column(Text)
    horas_tiempo_empleado = Column(DECIMAL(8, 2))
    
    # Datos adicionales
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"))
    datos_extra = Column(JSONB)
    
    # Fechas
    fecha_entrega_ideal = Column(DateTime(timezone=True))
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_cierre = Column(DateTime(timezone=True))
    resuelto_en = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    categoria = relationship("CategoriaTicket", back_populates="tickets")
    comentarios = relationship("ComentarioTicket", back_populates="ticket")


class ComentarioTicket(Base):
    """Comentarios en tickets"""
    __tablename__ = "comentarios_ticket"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String(50), ForeignKey("tickets.id"), nullable=False)
    comentario = Column(Text, nullable=False)
    es_interno = Column(Boolean, default=False)
    usuario_id = Column(String(50))
    nombre_usuario = Column(String(255))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    ticket = relationship("Ticket", back_populates="comentarios")
