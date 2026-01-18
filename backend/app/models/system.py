"""
Modelos del sistema y configuraciones
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SystemSetting(Base):
    __tablename__ = "configuraciones_sistema"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String(50), ForeignKey("usuarios_autenticacion.id"), nullable=False)
    categoria = Column(String(100), nullable=False)
    clave = Column(String(100), nullable=False)
    valor = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    usuario = relationship("AuthUser", back_populates="configuraciones")


# Modelos existentes (mantener compatibilidad)
class ActivityLog(Base):
    __tablename__ = "registros_actividad"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    fecha = Column(DateTime(timezone=True), nullable=False)
    descripcion = Column(Text, nullable=False)
    categoria = Column(String(100))
    usuario_id = Column(String(255))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="logs_actividad")


class Incident(Base):
    __tablename__ = "incidentes"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    fecha_reporte = Column(DateTime(timezone=True), nullable=False)
    fecha_resolucion = Column(DateTime(timezone=True))
    descripcion = Column(Text, nullable=False)
    severidad = Column(String(50))
    impacto = Column(String(50))
    estado = Column(String(50), default="Abierta")
    asignado_a = Column(String(255))
    
    # CAMPOS PARA INDICADORES DE CALIDAD
    es_derivado_produccion = Column(Boolean, default=False)
    tipo_incidente = Column(String(50))  # 'production', 'development', 'testing', 'deployment'
    nivel_severidad = Column(String(20))  # 'low', 'medium', 'high', 'critical'
    horas_tiempo_respuesta = Column(DECIMAL(8, 2))
    horas_tiempo_resolucion = Column(DECIMAL(8, 2))
    es_retrabajo = Column(Boolean, default=False)
    
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="incidentes")
