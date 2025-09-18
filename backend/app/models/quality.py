"""
Modelos de controles de calidad
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class QualityControlCatalog(Base):
    __tablename__ = "quality_control_catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    control_code = Column(String(20), unique=True, nullable=False)  # C003-GT, C021-GT, etc.
    control_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    stage_prefix = Column(String(50), nullable=False)  # '1-2', '5-7', '8-10'
    stage_description = Column(String(255))
    deliverables = Column(Text)  # Lista de entregables separados por comas
    validation_criteria = Column(Text)
    responsible_party = Column(String(50), nullable=False)  # 'analista', 'arquitecto', 'equipo_interno'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development_controls = relationship("DevelopmentQualityControl", back_populates="catalog")


class DevelopmentQualityControl(Base):
    __tablename__ = "development_quality_controls"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    control_catalog_id = Column(Integer, ForeignKey("quality_control_catalog.id"), nullable=False)
    control_code = Column(String(20), nullable=False)
    status = Column(String(50), default="Pendiente")  # 'Pendiente', 'Completado', 'No Aplica', 'Rechazado'
    validation_status = Column(String(50), default="Pendiente")  # 'Pendiente', 'Validado', 'Rechazado', 'En Revisión'
    completed_by = Column(String(255))
    completed_at = Column(DateTime(timezone=True))
    validated_by = Column(String(255))
    validated_at = Column(DateTime(timezone=True))
    deliverables_provided = Column(Text)  # JSON string con entregables completados
    deliverables_completed = Column(Text)  # JSON array de entregables marcados como completados
    validation_notes = Column(Text)
    rejection_reason = Column(Text)
    evidence_files = Column(Text)  # JSON array de archivos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="quality_controls")
    catalog = relationship("QualityControlCatalog", back_populates="development_controls")
