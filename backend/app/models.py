"""
Modelos SQLAlchemy del Sistema de Gestión de Proyectos TI

Este archivo mantiene compatibilidad hacia atrás importando todos los modelos
de la nueva estructura modular.
"""

# Importar todos los modelos desde la nueva estructura modular
from .models.auth import AuthUser, AuthToken, UserSession, Permission, RolePermission
from .models.development import (
    DevelopmentPhase, DevelopmentStage, Development, DevelopmentDate,
    DevelopmentProposal, DevelopmentProvider,
    DevelopmentResponsible, DevelopmentStatusHistory, DevelopmentObservation
)
from .models.quality import QualityControlCatalog, DevelopmentQualityControl
from .models.kpi import (
    DevelopmentKpiMetric, DevelopmentFunctionality, DevelopmentQualityMetric,
    DevelopmentTestResult, DevelopmentDeliveryHistory
)
from .models.alerts import DevelopmentUpcomingActivity
from .models.chat import ChatSession, ChatMessage
from .models.system import SystemSetting, ActivityLog, Incident
from .models.mcp import AiContextCache, AiAnalysisHistory, AiRecommendation, AiUsageMetric, AiModelConfig

# Mantener compatibilidad con modelos legacy
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

# Modelo User legacy (mantener por compatibilidad)
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(50), nullable=False)
    avatar = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Modelo Communication legacy (mantener por compatibilidad)
class Communication(Base):
    __tablename__ = "communications"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50))  # ID del desarrollo
    message = Column(Text, nullable=False)
    sender = Column(String(255), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, default=datetime.utcnow)  # Para compatibilidad con crud.py
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Modelo Project legacy (mantener por compatibilidad)
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="active")  # active, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
