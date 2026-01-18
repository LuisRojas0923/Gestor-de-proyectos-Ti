"""
Modelos de Autenticacion - Backend V2
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Usuario(Base):
    """Modelo de usuario del sistema"""
    __tablename__ = "usuarios"
    
    id = Column(String(50), primary_key=True)
    cedula = Column(String(50), unique=True, index=True)
    correo = Column(String(255), unique=True, nullable=True, index=True)
    hash_contrasena = Column(String(255), nullable=False)
    nombre = Column(String(255), nullable=False)
    rol = Column(String(50), nullable=False, default="usuario")
    esta_activo = Column(Boolean, default=True)
    url_avatar = Column(String(500))
    zona_horaria = Column(String(50), default="America/Bogota")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    ultimo_login = Column(DateTime(timezone=True))
    
    # Relaciones
    tokens = relationship("Token", back_populates="usuario", cascade="all, delete-orphan")
    sesiones = relationship("Sesion", back_populates="usuario", cascade="all, delete-orphan")


class Token(Base):
    """Modelo de tokens de autenticacion"""
    __tablename__ = "tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String(50), ForeignKey("usuarios.id"), nullable=False)
    hash_token = Column(String(255), nullable=False)
    tipo_token = Column(String(50), nullable=False)  # 'access', 'refresh'
    nombre = Column(String(255))
    expira_en = Column(DateTime(timezone=True), nullable=False)
    ultimo_uso_en = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="tokens")


class Sesion(Base):
    """Modelo de sesiones de usuario"""
    __tablename__ = "sesiones"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String(50), ForeignKey("usuarios.id"), nullable=False)
    token_sesion = Column(String(255), unique=True, nullable=False)
    direccion_ip = Column(String(45))
    agente_usuario = Column(Text)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="sesiones")
