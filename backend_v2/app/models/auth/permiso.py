"""
Modelos de Permisos - Backend V2
"""
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Permiso(Base):
    """Modelo de permisos del sistema"""
    __tablename__ = "permisos"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text)
    recurso = Column(String(100), nullable=False)
    accion = Column(String(50), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class PermisoRol(Base):
    """Relacion entre roles y permisos"""
    __tablename__ = "permisos_rol"
    
    rol = Column(String(50), primary_key=True)
    permiso_id = Column(Integer, ForeignKey("permisos.id"), primary_key=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    permiso = relationship("Permiso")
