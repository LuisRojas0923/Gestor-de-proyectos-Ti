"""
Modelos de alertas y actividades próximas
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DevelopmentUpcomingActivity(Base):
    __tablename__ = "development_upcoming_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    activity_type = Column(String(100), nullable=False)  # 'entrega_proveedor', 'reunion', 'entrega_usuario', 'revision'
    title = Column(String(255), nullable=False)
    description = Column(Text)
    due_date = Column(Date, nullable=False)
    responsible_party = Column(String(100), nullable=False)  # 'proveedor', 'usuario', 'equipo_interno'
    responsible_person = Column(String(255))
    status = Column(String(50), default="Pendiente")  # 'Pendiente', 'Completado', 'Vencido', 'Cancelado'
    priority = Column(String(20), default="Media")  # 'Alta', 'Media', 'Baja'
    alert_sent = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True))
    created_by = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="upcoming_activities")
