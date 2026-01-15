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
    user_id = Column(String(50), ForeignKey("usuarios_autenticacion.id"), nullable=False)
    category = Column(String(100), nullable=False)
    key = Column(String(100), nullable=False)
    value = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    user = relationship("AuthUser", back_populates="settings")


# Modelos existentes (mantener compatibilidad)
class ActivityLog(Base):
    __tablename__ = "registros_actividad"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100))
    user_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="activity_logs")


class Incident(Base):
    __tablename__ = "incidentes"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    report_date = Column(DateTime(timezone=True), nullable=False)
    resolution_date = Column(DateTime(timezone=True))
    description = Column(Text, nullable=False)
    severity = Column(String(50))
    impact = Column(String(50))
    status = Column(String(50), default="Abierta")
    assigned_to = Column(String(255))
    
    # CAMPOS PARA INDICADORES DE CALIDAD
    is_production_derived = Column(Boolean, default=False)
    incident_type = Column(String(50))  # 'production', 'development', 'testing', 'deployment'
    severity_level = Column(String(20))  # 'low', 'medium', 'high', 'critical'
    response_time_hours = Column(DECIMAL(8, 2))
    resolution_time_hours = Column(DECIMAL(8, 2))
    is_rework = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="incidents")
