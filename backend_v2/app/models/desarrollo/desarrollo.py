"""
Modelos de Desarrollo - Backend V2
Incluye: Desarrollo, Fase, Etapa, Responsable
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, DECIMAL, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class FaseDesarrollo(Base):
    """Fases del ciclo de desarrollo"""
    __tablename__ = "fases_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(20), unique=True, nullable=False)
    orden = Column(Integer, nullable=False)
    descripcion = Column(Text)
    color = Column(String(20), default="#3498db")
    esta_activa = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    etapas = relationship("EtapaDesarrollo", back_populates="fase")
    desarrollos = relationship("Desarrollo", back_populates="fase_actual")


class EtapaDesarrollo(Base):
    """Etapas dentro de cada fase"""
    __tablename__ = "etapas_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    fase_id = Column(Integer, ForeignKey("fases_desarrollo.id"), nullable=False)
    nombre = Column(String(100), nullable=False)
    codigo = Column(String(20), nullable=False)
    orden = Column(Integer, nullable=False)
    descripcion = Column(Text)
    duracion_estimada_dias = Column(Integer)
    porcentaje_inicio = Column(DECIMAL(5, 2), default=0)
    porcentaje_fin = Column(DECIMAL(5, 2), default=100)
    esta_activa = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    fase = relationship("FaseDesarrollo", back_populates="etapas")
    desarrollos = relationship("Desarrollo", back_populates="etapa_actual")


class Desarrollo(Base):
    """Modelo principal de desarrollo/proyecto"""
    __tablename__ = "desarrollos"
    
    id = Column(String(50), primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text)
    modulo = Column(String(100))
    tipo = Column(String(50))
    ambiente = Column(String(100))
    enlace_portal = Column(Text)
    proveedor = Column(String(100))
    responsable = Column(String(255))
    
    # Estado y progreso
    estado_general = Column(String(50), default="Pendiente")
    fase_actual_id = Column(Integer, ForeignKey("fases_desarrollo.id"))
    etapa_actual_id = Column(Integer, ForeignKey("etapas_desarrollo.id"))
    porcentaje_progreso = Column(DECIMAL(5, 2), default=0)
    
    # Fechas
    fecha_inicio = Column(Date)
    fecha_estimada_fin = Column(Date)
    fecha_real_fin = Column(Date)
    
    # Auditora
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    fase_actual = relationship("FaseDesarrollo", back_populates="desarrollos")
    etapa_actual = relationship("EtapaDesarrollo", back_populates="desarrollos")
    responsables = relationship("ResponsableDesarrollo", back_populates="desarrollo")
    fechas = relationship("FechaDesarrollo", back_populates="desarrollo")
    observaciones = relationship("ObservacionDesarrollo", back_populates="desarrollo")
