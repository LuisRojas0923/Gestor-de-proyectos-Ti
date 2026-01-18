"""
Modelos de Alertas y Actividades - Backend V2
"""
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ActividadProxima(Base):
    """Actividades proximas y alertas"""
    __tablename__ = "actividades_proximas"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    tipo_actividad = Column(String(100), nullable=False)
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text)
    fecha_vencimiento = Column(Date, nullable=False)
    parte_responsable = Column(String(100), nullable=False)
    persona_responsable = Column(String(255))
    estado = Column(String(50), default="Pendiente")
    prioridad = Column(String(20), default="Media")
    alerta_enviada = Column(Boolean, default=False)
    completado_en = Column(DateTime(timezone=True))
    creado_por = Column(String(255))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())


class RegistroActividad(Base):
    """Log de actividades del sistema"""
    __tablename__ = "registro_actividades"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"))
    etapa_id = Column(Integer)
    tipo_actividad = Column(String(100), nullable=False)
    fecha_inicio = Column(DateTime(timezone=True))
    fecha_fin = Column(DateTime(timezone=True))
    proximo_seguimiento_en = Column(DateTime(timezone=True))
    estado = Column(String(50), default="pendiente")
    tipo_actor = Column(String(50))
    datos_dinamicos = Column(Text)  # JSON
    creado_por = Column(String(255))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
