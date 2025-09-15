"""
Schemas Pydantic para endpoints de IA con MCP
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class AnalysisQuery(BaseModel):
    """Schema para consultas de análisis de IA"""
    question: str = Field(..., min_length=1, max_length=1000, description="Pregunta para el análisis")
    context: Optional[Dict[str, Any]] = Field(None, description="Contexto adicional")
    model: Optional[str] = Field("claude-3-sonnet", description="Modelo de IA a usar")


class AnalysisResponse(BaseModel):
    """Schema para respuestas de análisis de IA"""
    analysis: str = Field(..., description="Análisis generado por IA")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Nivel de confianza")
    sources: Optional[List[str]] = Field(None, description="Fuentes de información utilizadas")
    timestamp: datetime = Field(..., description="Timestamp del análisis")
    model_used: str = Field(..., description="Modelo de IA utilizado")


class RecommendationRequest(BaseModel):
    """Schema para solicitud de recomendaciones"""
    context_type: str = Field(..., description="Tipo de contexto")
    priority: Optional[str] = Field("medium", description="Prioridad de la recomendación")
    focus_areas: Optional[List[str]] = Field(None, description="Áreas de enfoque")


class Recommendation(BaseModel):
    """Schema para recomendación individual"""
    title: str = Field(..., description="Título de la recomendación")
    description: str = Field(..., description="Descripción detallada")
    priority: str = Field(..., description="Prioridad")
    category: str = Field(..., description="Categoría")
    confidence: float = Field(..., ge=0, le=1, description="Nivel de confianza")
    estimated_impact: Optional[str] = Field(None, description="Impacto estimado")


class RecommendationResponse(BaseModel):
    """Schema para respuesta de recomendaciones"""
    recommendations: List[Recommendation] = Field(..., description="Lista de recomendaciones")
    summary: str = Field(..., description="Resumen del análisis")
    timestamp: datetime = Field(..., description="Timestamp de la respuesta")


class ChatQuery(BaseModel):
    """Schema para consulta de chat contextual"""
    message: str = Field(..., min_length=1, max_length=2000, description="Mensaje del usuario")
    session_id: Optional[str] = Field(None, description="ID de sesión de chat")
    context_development_id: Optional[str] = Field(None, description="ID de desarrollo para contexto")
    include_history: bool = Field(True, description="Incluir historial de chat")


class ChatResponse(BaseModel):
    """Schema para respuesta de chat"""
    response: str = Field(..., description="Respuesta del asistente")
    session_id: str = Field(..., description="ID de sesión")
    context_used: List[str] = Field(..., description="Tipos de contexto utilizados")
    timestamp: datetime = Field(..., description="Timestamp de la respuesta")


class TrendInsight(BaseModel):
    """Schema para insight de tendencia"""
    metric_name: str = Field(..., description="Nombre de la métrica")
    trend_direction: str = Field(..., description="Dirección de la tendencia")
    change_percentage: float = Field(..., description="Porcentaje de cambio")
    significance: str = Field(..., description="Significancia del cambio")
    recommendation: Optional[str] = Field(None, description="Recomendación basada en la tendencia")


class TrendAnalysisResponse(BaseModel):
    """Schema para respuesta de análisis de tendencias"""
    insights: List[TrendInsight] = Field(..., description="Lista de insights")
    overall_assessment: str = Field(..., description="Evaluación general")
    key_findings: List[str] = Field(..., description="Hallazgos clave")
    timestamp: datetime = Field(..., description="Timestamp del análisis")


class TimelinePrediction(BaseModel):
    """Schema para predicción de cronograma"""
    milestone: str = Field(..., description="Hito o actividad")
    predicted_date: datetime = Field(..., description="Fecha predicha")
    confidence: float = Field(..., ge=0, le=1, description="Nivel de confianza")
    risk_factors: List[str] = Field(..., description="Factores de riesgo identificados")


class TimelinePredictionResponse(BaseModel):
    """Schema para respuesta de predicción de cronograma"""
    predictions: List[TimelinePrediction] = Field(..., description="Lista de predicciones")
    overall_timeline: str = Field(..., description="Resumen del cronograma")
    risk_assessment: str = Field(..., description="Evaluación de riesgos")
    recommendations: List[str] = Field(..., description="Recomendaciones para mejorar cronograma")
    timestamp: datetime = Field(..., description="Timestamp de la predicción")
