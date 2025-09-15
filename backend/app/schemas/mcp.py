"""
Schemas Pydantic para MCP (Model Context Protocol)
Sistema de Gestión de Proyectos TI - Integración con IA
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from decimal import Decimal


# =====================================================================================
# SCHEMAS PARA AI_CONTEXT_CACHE
# =====================================================================================

class AiContextCacheBase(BaseModel):
    """Schema base para cache de contexto de IA"""
    context_key: str = Field(..., max_length=255, description="Hash único del contexto")
    development_id: Optional[str] = Field(None, max_length=50, description="ID del desarrollo")
    context_type: str = Field(..., max_length=50, description="Tipo de contexto")
    context_data: Dict[str, Any] = Field(..., description="Datos del contexto en JSON")
    expires_at: datetime = Field(..., description="Fecha de expiración del cache")

    @validator('context_type')
    def validate_context_type(cls, v):
        allowed_types = ['development', 'provider', 'kpi', 'quality', 'dashboard', 'analysis']
        if v not in allowed_types:
            raise ValueError(f'context_type debe ser uno de: {allowed_types}')
        return v


class AiContextCacheCreate(AiContextCacheBase):
    """Schema para crear cache de contexto"""
    pass


class AiContextCache(AiContextCacheBase):
    """Schema completo para cache de contexto"""
    id: int
    created_at: datetime
    access_count: int = 0
    last_accessed_at: datetime

    class Config:
        from_attributes = True


# =====================================================================================
# SCHEMAS PARA AI_ANALYSIS_HISTORY
# =====================================================================================

class AiAnalysisHistoryBase(BaseModel):
    """Schema base para historial de análisis de IA"""
    development_id: Optional[str] = Field(None, max_length=50, description="ID del desarrollo")
    analysis_type: str = Field(..., max_length=100, description="Tipo de análisis")
    query_text: str = Field(..., description="Pregunta original del usuario")
    context_used: Optional[Dict[str, Any]] = Field(None, description="Contexto enviado a la IA")
    ai_response: str = Field(..., description="Respuesta de la IA")
    ai_model: str = Field(..., max_length=50, description="Modelo de IA utilizado")
    tokens_used: Optional[int] = Field(None, ge=0, description="Tokens consumidos")
    response_time_ms: Optional[int] = Field(None, ge=0, description="Tiempo de respuesta en ms")
    user_id: Optional[str] = Field(None, max_length=50, description="Usuario que hizo la consulta")
    confidence_score: Optional[Decimal] = Field(None, ge=0, le=1, description="Confianza de la IA")
    was_helpful: Optional[bool] = Field(None, description="Feedback del usuario")

    @validator('analysis_type')
    def validate_analysis_type(cls, v):
        allowed_types = [
            'risk_analysis', 'performance_review', 'prediction', 'recommendation',
            'chat', 'dashboard_insights', 'trend_analysis', 'quality_review'
        ]
        if v not in allowed_types:
            raise ValueError(f'analysis_type debe ser uno de: {allowed_types}')
        return v


class AiAnalysisHistoryCreate(AiAnalysisHistoryBase):
    """Schema para crear historial de análisis"""
    pass


class AiAnalysisHistory(AiAnalysisHistoryBase):
    """Schema completo para historial de análisis"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# =====================================================================================
# SCHEMAS PARA AI_RECOMMENDATIONS
# =====================================================================================

class AiRecommendationBase(BaseModel):
    """Schema base para recomendaciones de IA"""
    development_id: Optional[str] = Field(None, max_length=50, description="ID del desarrollo")
    recommendation_type: str = Field(..., max_length=100, description="Tipo de recomendación")
    title: str = Field(..., max_length=255, description="Título de la recomendación")
    description: str = Field(..., description="Descripción detallada")
    priority: str = Field("medium", max_length=20, description="Prioridad")
    impact_score: Optional[Decimal] = Field(None, ge=0, le=1, description="Impacto esperado")
    effort_score: Optional[Decimal] = Field(None, ge=0, le=1, description="Esfuerzo requerido")
    ai_confidence: Optional[Decimal] = Field(None, ge=0, le=1, description="Confianza de la IA")
    assigned_to: Optional[str] = Field(None, max_length=255, description="Responsable")
    due_date: Optional[date] = Field(None, description="Fecha límite sugerida")
    generated_by: str = Field(..., max_length=50, description="Modelo de IA que generó")

    @validator('recommendation_type')
    def validate_recommendation_type(cls, v):
        allowed_types = [
            'process_improvement', 'risk_mitigation', 'timeline_optimization',
            'resource_optimization', 'quality_improvement', 'cost_reduction'
        ]
        if v not in allowed_types:
            raise ValueError(f'recommendation_type debe ser uno de: {allowed_types}')
        return v

    @validator('priority')
    def validate_priority(cls, v):
        allowed_priorities = ['low', 'medium', 'high', 'critical']
        if v not in allowed_priorities:
            raise ValueError(f'priority debe ser uno de: {allowed_priorities}')
        return v


class AiRecommendationCreate(AiRecommendationBase):
    """Schema para crear recomendación"""
    pass


class AiRecommendationUpdate(BaseModel):
    """Schema para actualizar recomendación"""
    status: Optional[str] = Field(None, max_length=50, description="Estado")
    implementation_notes: Optional[str] = Field(None, description="Notas de implementación")
    assigned_to: Optional[str] = Field(None, max_length=255, description="Responsable")
    due_date: Optional[date] = Field(None, description="Fecha límite")
    results_feedback: Optional[str] = Field(None, description="Feedback de resultados")

    @validator('status')
    def validate_status(cls, v):
        if v is None:
            return v
        allowed_statuses = ['pending', 'accepted', 'rejected', 'implemented']
        if v not in allowed_statuses:
            raise ValueError(f'status debe ser uno de: {allowed_statuses}')
        return v


class AiRecommendation(AiRecommendationBase):
    """Schema completo para recomendación"""
    id: int
    status: str = "pending"
    implementation_notes: Optional[str] = None
    implemented_at: Optional[datetime] = None
    results_feedback: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =====================================================================================
# SCHEMAS PARA AI_USAGE_METRICS
# =====================================================================================

class AiUsageMetricBase(BaseModel):
    """Schema base para métricas de uso de IA"""
    user_id: Optional[str] = Field(None, max_length=50, description="ID del usuario")
    ai_model: str = Field(..., max_length=50, description="Modelo de IA usado")
    operation_type: str = Field(..., max_length=100, description="Tipo de operación")
    tokens_input: int = Field(0, ge=0, description="Tokens de entrada")
    tokens_output: int = Field(0, ge=0, description="Tokens de salida")
    cost_estimate: Optional[Decimal] = Field(None, ge=0, description="Costo estimado en USD")
    response_time_ms: Optional[int] = Field(None, ge=0, description="Tiempo de respuesta")
    success: bool = Field(True, description="Si la operación fue exitosa")
    error_message: Optional[str] = Field(None, description="Mensaje de error")
    context_size: Optional[int] = Field(None, ge=0, description="Tamaño del contexto")

    @validator('operation_type')
    def validate_operation_type(cls, v):
        allowed_types = [
            'analysis', 'chat', 'recommendation', 'prediction',
            'dashboard', 'risk_detection', 'trend_analysis'
        ]
        if v not in allowed_types:
            raise ValueError(f'operation_type debe ser uno de: {allowed_types}')
        return v


class AiUsageMetricCreate(AiUsageMetricBase):
    """Schema para crear métrica de uso"""
    pass


class AiUsageMetric(AiUsageMetricBase):
    """Schema completo para métrica de uso"""
    id: int
    created_at: datetime
    date_partition: date

    class Config:
        from_attributes = True


# =====================================================================================
# SCHEMAS PARA AI_MODEL_CONFIGS
# =====================================================================================

class AiModelConfigBase(BaseModel):
    """Schema base para configuración de modelo de IA"""
    model_name: str = Field(..., max_length=50, description="Nombre único del modelo")
    provider: str = Field(..., max_length=50, description="Proveedor del modelo")
    is_active: bool = Field(True, description="Si el modelo está activo")
    max_tokens: int = Field(4000, ge=1, description="Máximo de tokens por request")
    temperature: Decimal = Field(Decimal('0.7'), ge=0, le=1, description="Temperatura del modelo")
    cost_per_input_token: Optional[Decimal] = Field(None, ge=0, description="Costo por token de entrada")
    cost_per_output_token: Optional[Decimal] = Field(None, ge=0, description="Costo por token de salida")
    rate_limit_per_minute: int = Field(60, ge=1, description="Límite de requests por minuto")
    context_window: int = Field(200000, ge=1, description="Ventana de contexto del modelo")
    specialization: Optional[str] = Field(None, description="Especialización del modelo")
    configuration: Optional[Dict[str, Any]] = Field(None, description="Configuración específica")

    @validator('provider')
    def validate_provider(cls, v):
        allowed_providers = ['anthropic', 'openai', 'google', 'mistral', 'local']
        if v not in allowed_providers:
            raise ValueError(f'provider debe ser uno de: {allowed_providers}')
        return v


class AiModelConfigCreate(AiModelConfigBase):
    """Schema para crear configuración de modelo"""
    pass


class AiModelConfigUpdate(BaseModel):
    """Schema para actualizar configuración de modelo"""
    is_active: Optional[bool] = None
    max_tokens: Optional[int] = Field(None, ge=1)
    temperature: Optional[Decimal] = Field(None, ge=0, le=1)
    cost_per_input_token: Optional[Decimal] = Field(None, ge=0)
    cost_per_output_token: Optional[Decimal] = Field(None, ge=0)
    rate_limit_per_minute: Optional[int] = Field(None, ge=1)
    specialization: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None


class AiModelConfig(AiModelConfigBase):
    """Schema completo para configuración de modelo"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =====================================================================================
# SCHEMAS PARA ANÁLISIS Y CONSULTAS
# =====================================================================================

class AnalysisQuery(BaseModel):
    """Schema para consultas de análisis"""
    question: str = Field(..., description="Pregunta para el análisis")
    context_type: Optional[str] = Field("development", description="Tipo de contexto")
    include_history: bool = Field(True, description="Incluir análisis previos")
    model_preference: Optional[str] = Field(None, description="Modelo preferido")


class ChatQuery(BaseModel):
    """Schema para consultas de chat"""
    message: str = Field(..., description="Mensaje del usuario")
    development_id: Optional[str] = Field(None, description="ID del desarrollo para contexto")
    conversation_id: Optional[str] = Field(None, description="ID de la conversación")


class RecommendationRequest(BaseModel):
    """Schema para solicitar recomendaciones"""
    development_id: str = Field(..., description="ID del desarrollo")
    focus_areas: Optional[List[str]] = Field(None, description="Áreas de enfoque")
    priority_level: Optional[str] = Field("medium", description="Nivel de prioridad mínimo")


# =====================================================================================
# SCHEMAS PARA RESPUESTAS
# =====================================================================================

class AiAnalysisResponse(BaseModel):
    """Schema para respuesta de análisis de IA"""
    analysis: str = Field(..., description="Análisis generado")
    confidence: Optional[float] = Field(None, description="Nivel de confianza")
    recommendations: Optional[List[str]] = Field(None, description="Recomendaciones")
    risks: Optional[List[str]] = Field(None, description="Riesgos identificados")
    next_steps: Optional[List[str]] = Field(None, description="Próximos pasos sugeridos")
    model_used: str = Field(..., description="Modelo de IA utilizado")
    tokens_used: Optional[int] = Field(None, description="Tokens consumidos")
    response_time_ms: Optional[int] = Field(None, description="Tiempo de respuesta")


class UsageSummary(BaseModel):
    """Schema para resumen de uso de IA"""
    total_operations: int
    total_cost: Decimal
    avg_response_time: float
    success_rate: float
    most_used_model: str
    period_start: date
    period_end: date


class RecommendationEffectiveness(BaseModel):
    """Schema para efectividad de recomendaciones"""
    recommendation_type: str
    total_recommendations: int
    implemented_count: int
    implementation_rate: float
    avg_impact_score: Optional[float]
    avg_confidence: Optional[float]
