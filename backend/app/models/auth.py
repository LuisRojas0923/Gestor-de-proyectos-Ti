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
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    avatar_url = Column(String(500))
    timezone = Column(String(50), default="UTC")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Relaciones
    tokens = relationship("AuthToken", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("SystemSetting", back_populates="user", cascade="all, delete-orphan")
    
    # Relaciones MCP (IA)
    ai_analysis_history = relationship("AiAnalysisHistory", back_populates="user", cascade="all, delete-orphan")
    ai_usage_metrics = relationship("AiUsageMetric", back_populates="user", cascade="all, delete-orphan")


class AuthToken(Base):
    __tablename__ = "tokens_autenticacion"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("usuarios_autenticacion.id"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    token_type = Column(String(50), nullable=False)  # 'access', 'refresh', 'api'
    name = Column(String(255))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_used_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    user = relationship("AuthUser", back_populates="tokens")


class UserSession(Base):
    __tablename__ = "sesiones_usuario"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("usuarios_autenticacion.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    user = relationship("AuthUser", back_populates="sessions")


class Permission(Base):
    __tablename__ = "permisos"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    resource = Column(String(100), nullable=False)  # 'developments', 'quality', 'kpi'
    action = Column(String(50), nullable=False)     # 'read', 'write', 'delete', 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RolePermission(Base):
    __tablename__ = "permisos_rol"
    
    role = Column(String(50), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permisos.id"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    permission = relationship("Permission")
