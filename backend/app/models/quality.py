"""
Modelos de controles de calidad
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class QualityControlCatalog(Base):
    __tablename__ = "catalogo_control_calidad"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo_control = Column(String(20), unique=True, nullable=False)  # C003-GT, C021-GT, etc.
    nombre_control = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=False)
    prefijo_etapa = Column(String(50), nullable=False)  # '1-2', '5-7', '8-10'
    descripcion_etapa = Column(String(255))
    entregables = Column(Text)  # Lista de entregables separados por comas
    criterios_validacion = Column(Text)
    parte_responsable = Column(String(50), nullable=False)  # 'analista', 'arquitecto', 'equipo_interno'
    esta_activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    controles_desarrollo = relationship("DevelopmentQualityControl", back_populates="catalogo")


class DevelopmentQualityControl(Base):
    __tablename__ = "controles_calidad_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    catalogo_control_id = Column(Integer, ForeignKey("catalogo_control_calidad.id"), nullable=False)
    codigo_control = Column(String(20), nullable=False)
    estado = Column(String(50), default="Pendiente")  # 'Pendiente', 'Completado', 'No Aplica', 'Rechazado'
    estado_validacion = Column(String(50), default="Pendiente")  # 'Pendiente', 'Validado', 'Rechazado', 'En Revisión'
    completado_por = Column(String(255))
    completado_en = Column(DateTime(timezone=True))
    validado_por = Column(String(255))
    validado_en = Column(DateTime(timezone=True))
    entregables_proporcionados = Column(Text)  # JSON string con entregables completados
    entregables_completados = Column(Text)  # JSON array de entregables marcados como completados
    notas_validacion = Column(Text)
    motivo_rechazo = Column(Text)
    archivos_evidencia = Column(Text)  # JSON array de archivos
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="controles_calidad")
    catalogo = relationship("QualityControlCatalog", back_populates="controles_desarrollo")
