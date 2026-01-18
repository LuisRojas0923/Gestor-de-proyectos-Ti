"""
Modelos auxiliares de Desarrollo - Backend V2
Incluye: Responsable, Fecha, Observacion
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ResponsableDesarrollo(Base):
    """Responsables asignados a un desarrollo"""
    __tablename__ = "responsables_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    nombre_usuario = Column(String(255), nullable=False)
    tipo_rol = Column(String(50), default="responsable")
    es_principal = Column(Boolean, default=False)
    fecha_asignacion = Column(Date)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Desarrollo", back_populates="responsables")


class FechaDesarrollo(Base):
    """Fechas importantes de un desarrollo"""
    __tablename__ = "fechas_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    tipo_fecha = Column(String(50), nullable=False)
    fecha = Column(Date, nullable=False)
    descripcion = Column(Text)
    estado_entrega = Column(String(50))
    estado_aprobacion = Column(String(50))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Desarrollo", back_populates="fechas")


class ObservacionDesarrollo(Base):
    """Observaciones/notas de un desarrollo"""
    __tablename__ = "observaciones_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    tipo_observacion = Column(String(50), nullable=False)
    observacion = Column(Text, nullable=False)
    creado_por = Column(String(255))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    desarrollo = relationship("Desarrollo", back_populates="observaciones")
