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


