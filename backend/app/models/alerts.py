"""
Modelos de alertas y actividades próximas
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DevelopmentUpcomingActivity(Base):
    __tablename__ = "proximas_actividades_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    tipo_actividad = Column(String(100), nullable=False)  # 'entrega_proveedor', 'reunion', 'entrega_usuario', 'revision'
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text)
    fecha_vencimiento = Column(Date, nullable=False)
    parte_responsable = Column(String(100), nullable=False)  # 'proveedor', 'usuario', 'equipo_interno'
    persona_responsable = Column(String(255))
    estado = Column(String(50), default="Pendiente")  # 'Pendiente', 'Completado', 'Vencido', 'Cancelado'
    prioridad = Column(String(20), default="Media")  # 'Alta', 'Media', 'Baja'
    alerta_enviada = Column(Boolean, default=False)
    completado_en = Column(DateTime(timezone=True))
    creado_por = Column(String(255))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="actividades_proximas")
