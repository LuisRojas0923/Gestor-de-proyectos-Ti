"""
Modelos SQLAlchemy del Sistema de Gestión de Proyectos TI
"""

from app.database import Base

# Importar todos los modelos para registro automático
from .auth import AuthUser, AuthToken, UserSession, Permission, RolePermission
from .development import (
    DevelopmentPhase, DevelopmentStage, Development, DevelopmentDate,
    DevelopmentProposal, DevelopmentInstaller, DevelopmentProvider,
    DevelopmentResponsible, DevelopmentStatusHistory, DevelopmentObservation
)
from .quality import QualityControlCatalog, DevelopmentQualityControl
from .kpi import (
    DevelopmentKpiMetric, DevelopmentFunctionality, DevelopmentQualityMetric,
    DevelopmentTestResult, DevelopmentDeliveryHistory
)
from .alerts import DevelopmentUpcomingActivity
from .chat import ChatSession, ChatMessage
from .system import SystemSetting, ActivityLog, Incident
from .mcp import AiContextCache, AiAnalysisHistory, AiRecommendation, AiUsageMetric, AiModelConfig

# Exportar todos los modelos
__all__ = [
    "Base",
    # Auth models
    "AuthUser", "AuthToken", "UserSession", "Permission", "RolePermission",
    # Development models
    "DevelopmentPhase", "DevelopmentStage", "Development", "DevelopmentDate",
    "DevelopmentProposal", "DevelopmentInstaller", "DevelopmentProvider",
    "DevelopmentResponsible", "DevelopmentStatusHistory", "DevelopmentObservation",
    # Quality models
    "QualityControlCatalog", "DevelopmentQualityControl",
    # KPI models
    "DevelopmentKpiMetric", "DevelopmentFunctionality", "DevelopmentQualityMetric",
    "DevelopmentTestResult", "DevelopmentDeliveryHistory",
    # Alert models
    "DevelopmentUpcomingActivity",
    # Chat models
    "ChatSession", "ChatMessage",
    # System models
    "SystemSetting", "ActivityLog", "Incident",
    # MCP models (IA)
    "AiContextCache", "AiAnalysisHistory", "AiRecommendation", "AiUsageMetric", "AiModelConfig"
]
