"""
Modelos de autenticación y usuarios
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AuthUser(Base):
    __tablename__ = "usuarios_autenticacion"
    
    id = Column(String(50), primary_key=True)
    cedula = Column(String(50), unique=True, index=True)
    correo = Column(String(255), unique=True, nullable=True, index=True)
    hash_contrasena = Column(String(255), nullable=False)
    nombre = Column(String(255), nullable=False)
    rol = Column(String(50), nullable=False, default="user")
    esta_activo = Column(Boolean, default=True)
    correo_verificado = Column(Boolean, default=False)
    url_avatar = Column(String(500))
    zona_horaria = Column(String(50), default="UTC")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    ultimo_login = Column(DateTime(timezone=True))
    
    # Relaciones
    tokens = relationship("AuthToken", back_populates="usuario", cascade="all, delete-orphan")
    sesiones = relationship("UserSession", back_populates="usuario", cascade="all, delete-orphan")
    sesiones_chat = relationship("ChatSession", back_populates="usuario", cascade="all, delete-orphan")
    configuraciones = relationship("SystemSetting", back_populates="usuario", cascade="all, delete-orphan")
    
    # Relaciones MCP (IA)
    historial_analisis_ia = relationship("AiAnalysisHistory", back_populates="usuario", cascade="all, delete-orphan")
    metricas_uso_ia = relationship("AiUsageMetric", back_populates="usuario", cascade="all, delete-orphan")


class AuthToken(Base):
    __tablename__ = "tokens_autenticacion"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String(50), ForeignKey("usuarios_autenticacion.id"), nullable=False)
    hash_token = Column(String(255), nullable=False)
    tipo_token = Column(String(50), nullable=False)  # 'access', 'refresh', 'api'
    nombre = Column(String(255))
    expira_en = Column(DateTime(timezone=True), nullable=False)
    ultimo_uso_en = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    usuario = relationship("AuthUser", back_populates="tokens")


class UserSession(Base):
    __tablename__ = "sesiones_usuario"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String(50), ForeignKey("usuarios_autenticacion.id"), nullable=False)
    token_sesion = Column(String(255), unique=True, nullable=False)
    direccion_ip = Column(String(45))
    agente_usuario = Column(Text)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    usuario = relationship("AuthUser", back_populates="sesiones")


class Permission(Base):
    __tablename__ = "permisos"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text)
    recurso = Column(String(100), nullable=False)  # 'developments', 'quality', 'kpi'
    accion = Column(String(50), nullable=False)     # 'read', 'write', 'delete', 'admin'
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class RolePermission(Base):
    __tablename__ = "permisos_rol"
    
    rol = Column(String(50), primary_key=True)
    permiso_id = Column(Integer, ForeignKey("permisos.id"), primary_key=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    permiso = relationship("Permission")
