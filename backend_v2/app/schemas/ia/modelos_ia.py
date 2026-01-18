"""
Schemas de IA - Backend V2
"""
from typing import Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime, date
from decimal import Decimal


class HistorialAnalisisIABase(BaseModel):
    """Schema base para historial de anlisis IA"""
    desarrollo_id: Optional[str] = None
    tipo_analisis: str = Field(..., max_length=100)
    texto_consulta: str
    contexto_usado: Optional[Any] = None
    respuesta_ia: str
    modelo_ia: str = Field(..., max_length=50)
    tokens_usados: Optional[int] = None
    tiempo_respuesta_ms: Optional[int] = None
    usuario_id: Optional[str] = None
    puntaje_confianza: Optional[Decimal] = None
    fue_util: Optional[bool] = None


class HistorialAnalisisIA(HistorialAnalisisIABase):
    """Schema completo de historial de anlisis IA"""
    id: int
    creado_en: datetime

    class Config:
        from_attributes = True


class RecomendacionIABase(BaseModel):
    """Schema base para recomendaciones IA"""
    desarrollo_id: Optional[str] = None
    tipo_recomendacion: str = Field(..., max_length=100)
    titulo: str = Field(..., max_length=255)
    descripcion: str
    prioridad: str = "media"
    puntaje_impacto: Optional[Decimal] = None
    puntaje_esfuerzo: Optional[Decimal] = None
    confianza_ia: Optional[Decimal] = None
    estado: str = "pendiente"
    asignado_a: Optional[str] = None
    fecha_limite: Optional[date] = None
    notas_implementacion: Optional[str] = None


class RecomendacionIA(RecomendacionIABase):
    """Schema completo de recomendacin IA"""
    id: int
    implementado_en: Optional[datetime] = None
    retroalimentacion_resultados: Optional[str] = None
    generado_por: str
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


class SolicitudAnalisisIA(BaseModel):
    """Schema para solicitar un anlisis a la IA"""
    desarrollo_id: str
    pregunta: str
    incluir_historial: bool = True
