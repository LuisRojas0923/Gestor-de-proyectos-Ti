"""
Modelos SQLAlchemy para MCP (Model Context Protocol)
Sistema de Gestión de Proyectos TI - Integración con IA
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, DECIMAL, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AiContextCache(Base):
    """Cache de contexto para optimizar consultas de IA"""
    __tablename__ = "ai_context_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    context_key = Column(String(255), unique=True, nullable=False, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"))
    context_type = Column(String(50), nullable=False)  # 'development', 'provider', 'kpi', 'quality'
    context_data = Column(JSON, nullable=False)  # Contexto serializado
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    access_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="ai_context_cache")


class AiAnalysisHistory(Base):
    """Historial de análisis realizados por IA"""
    __tablename__ = "ai_analysis_history"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"))
    analysis_type = Column(String(100), nullable=False)  # 'risk_analysis', 'performance_review', 'prediction'
    query_text = Column(Text, nullable=False)  # Pregunta original del usuario
    context_used = Column(JSON)  # Contexto que se envió a la IA
    ai_response = Column(Text, nullable=False)  # Respuesta de la IA
    ai_model = Column(String(50), nullable=False)  # 'claude-3-sonnet', 'gpt-4', etc.
    tokens_used = Column(Integer)  # Tokens consumidos
    response_time_ms = Column(Integer)  # Tiempo de respuesta en ms
    user_id = Column(String(50), ForeignKey("auth_users.id"))  # Usuario que hizo la consulta
    confidence_score = Column(DECIMAL(3, 2))  # Confianza de la IA (0-1)
    was_helpful = Column(Boolean)  # Feedback del usuario
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="ai_analysis_history")
    user = relationship("AuthUser", back_populates="ai_analysis_history")


class AiRecommendation(Base):
    """Recomendaciones generadas por IA"""
    __tablename__ = "ai_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"))
    recommendation_type = Column(String(100), nullable=False)  # 'process_improvement', 'risk_mitigation', 'timeline_optimization'
    title = Column(String(255), nullable=False)  # Título de la recomendación
    description = Column(Text, nullable=False)  # Descripción detallada
    priority = Column(String(20), default="medium")  # 'low', 'medium', 'high', 'critical'
    impact_score = Column(DECIMAL(3, 2))  # Impacto esperado (0-1)
    effort_score = Column(DECIMAL(3, 2))  # Esfuerzo requerido (0-1)
    ai_confidence = Column(DECIMAL(3, 2))  # Confianza de la IA (0-1)
    status = Column(String(50), default="pending")  # 'pending', 'accepted', 'rejected', 'implemented'
    implementation_notes = Column(Text)  # Notas de implementación
    assigned_to = Column(String(255))  # Responsable de implementar
    due_date = Column(Date)  # Fecha límite sugerida
    implemented_at = Column(DateTime(timezone=True))  # Fecha de implementación
    results_feedback = Column(Text)  # Feedback de resultados
    generated_by = Column(String(50), nullable=False)  # Modelo de IA que generó
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="ai_recommendations")


class AiUsageMetric(Base):
    """Métricas de uso y costos de IA"""
    __tablename__ = "ai_usage_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("auth_users.id"))  # Usuario (puede ser NULL para métricas del sistema)
    ai_model = Column(String(50), nullable=False)  # Modelo de IA usado
    operation_type = Column(String(100), nullable=False)  # 'analysis', 'chat', 'recommendation', 'prediction'
    tokens_input = Column(Integer, default=0)  # Tokens de entrada
    tokens_output = Column(Integer, default=0)  # Tokens de salida
    cost_estimate = Column(DECIMAL(10, 4))  # Costo estimado en USD
    response_time_ms = Column(Integer)  # Tiempo de respuesta
    success = Column(Boolean, default=True)  # Si la operación fue exitosa
    error_message = Column(Text)  # Mensaje de error si falló
    context_size = Column(Integer)  # Tamaño del contexto enviado
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    date_partition = Column(Date, server_default=func.current_date())  # Para particionado por fecha
    
    # Relaciones
    user = relationship("AuthUser", back_populates="ai_usage_metrics")


class AiModelConfig(Base):
    """Configuraciones de modelos de IA disponibles"""
    __tablename__ = "ai_model_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(50), unique=True, nullable=False)  # 'claude-3-sonnet', 'gpt-4', etc.
    provider = Column(String(50), nullable=False)  # 'anthropic', 'openai'
    is_active = Column(Boolean, default=True)  # Si el modelo está activo
    max_tokens = Column(Integer, default=4000)  # Máximo de tokens por request
    temperature = Column(DECIMAL(3, 2), default=0.7)  # Temperatura del modelo
    cost_per_input_token = Column(DECIMAL(10, 8))  # Costo por token de entrada
    cost_per_output_token = Column(DECIMAL(10, 8))  # Costo por token de salida
    rate_limit_per_minute = Column(Integer, default=60)  # Límite de requests por minuto
    context_window = Column(Integer, default=200000)  # Ventana de contexto del modelo
    specialization = Column(Text)  # Especialización del modelo
    configuration = Column(JSON)  # Configuración específica del modelo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
