"""
Modelos para el sistema de tickets de soporte y servicios
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, DECIMAL, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class TicketCategory(Base):
    __tablename__ = "categorias_ticket"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    icon = Column(String(255))
    form_type = Column(String(50), nullable=False)  # 'support', 'development', 'asset'
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SupportTicket(Base):
    __tablename__ = "tickets_soporte"
    
    id = Column(String(50), primary_key=True)  # Formato TT-YYYYMMDD-XXX
    category_id = Column(String(50), ForeignKey("categorias_ticket.id"), nullable=False)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="Abierto")  # 'Abierto', 'En Proceso', 'Cerrado', 'Pendiente Info', 'Escalado'
    priority = Column(String(50), default="Media")
    
    # Datos del Solicitante
    creator_id = Column(String(50), nullable=False) # ID/Cédula
    creator_name = Column(String(255))
    creator_email = Column(String(255))
    creator_area = Column(String(100))
    creator_cargo = Column(String(100))
    creator_sede = Column(String(100))
    
    # Gestión del Técnico
    assigned_to = Column(String(255))
    diagnostic = Column(Text)
    resolution = Column(Text)
    notes = Column(Text) # Notas internas
    time_spent_hours = Column(DECIMAL(8, 2))
    
    # Fechas
    creation_date = Column(DateTime(timezone=True), server_default=func.now())
    close_date = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    ideal_delivery_date = Column(DateTime(timezone=True))
    
    # Metadatos extra (campos específicos según form_type)
    extra_data = Column(JSON) # Para guardar campos como justificacion_ia, hardware_solicitado, etc.
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development_id = Column(String(50), ForeignKey("desarrollos.id"))
    category = relationship("TicketCategory")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    development = relationship("Development")


class TicketComment(Base):
    __tablename__ = "comentarios_ticket"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String(50), ForeignKey("tickets_soporte.id"), nullable=False)
    user_id = Column(String(50))
    user_name = Column(String(255))
    comment = Column(Text, nullable=False)
    is_internal = Column(Integer, default=0) # 1 si es interno, 0 si es público
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    ticket = relationship("SupportTicket", back_populates="comments")
