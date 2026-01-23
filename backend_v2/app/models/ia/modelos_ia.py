"""
Modelos de IA/MCP - Backend V2 (SQLModel)
"""
from typing import Optional, Any
from datetime import datetime, date
from decimal import Decimal
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


# --- Modelos de Base de Datos (table=True) ---

class CacheContextoIA(SQLModel, table=True):
    """Cache de contexto para IA"""
    __tablename__ = "cache_contexto_ia"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    clave_contexto: str = Field(unique=True, max_length=255)
    desarrollo_id: Optional[str] = Field(default=None, max_length=50)
    tipo_contexto: str = Field(max_length=50)
    datos_contexto: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    expira_en: datetime
    conteo_accesos: int = Field(default=0)
    ultimo_acceso_en: Optional[datetime] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


class HistorialAnalisisIA(SQLModel, table=True):
    """Historial de analisis realizados por IA"""
    __tablename__ = "historial_analisis_ia"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    desarrollo_id: Optional[str] = Field(default=None, max_length=50)
    tipo_analisis: str = Field(max_length=100)
    texto_consulta: str
    contexto_usado: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    respuesta_ia: str
    modelo_ia: str = Field(max_length=50)
    tokens_usados: Optional[int] = Field(default=None)
    tiempo_respuesta_ms: Optional[int] = Field(default=None)
    usuario_id: Optional[str] = Field(default=None, max_length=50)
    puntaje_confianza: Optional[Decimal] = Field(default=None)
    fue_util: Optional[bool] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


class RecomendacionIA(SQLModel, table=True):
    """Recomendaciones generadas por IA"""
    __tablename__ = "recomendaciones_ia"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    desarrollo_id: Optional[str] = Field(default=None, max_length=50)
    tipo_recomendacion: str = Field(max_length=100)
    titulo: str = Field(max_length=255)
    descripcion: str
    prioridad: str = Field(default="media", max_length=20)
    puntaje_impacto: Optional[Decimal] = Field(default=None)
    puntaje_esfuerzo: Optional[Decimal] = Field(default=None)
    confianza_ia: Optional[Decimal] = Field(default=None)
    estado: str = Field(default="pendiente", max_length=50)
    asignado_a: Optional[str] = Field(default=None, max_length=255)
    fecha_limite: Optional[date] = Field(default=None)
    notas_implementacion: Optional[str] = Field(default=None)
    implementado_en: Optional[datetime] = Field(default=None)
    retroalimentacion_resultados: Optional[str] = Field(default=None)
    generado_por: str = Field(max_length=50)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)


# --- Schemas de Validacion ---

class HistorialAnalisisIACrear(SQLModel):
    """Schema para crear un historial de analisis IA"""
    desarrollo_id: Optional[str] = None
    tipo_analisis: str
    texto_consulta: str
    contexto_usado: Optional[Any] = None
    respuesta_ia: str
    modelo_ia: str
    tokens_usados: Optional[int] = None
    tiempo_respuesta_ms: Optional[int] = None
    usuario_id: Optional[str] = None
    puntaje_confianza: Optional[Decimal] = None
    fue_util: Optional[bool] = None


class RecomendacionIACrear(SQLModel):
    """Schema para crear una recomendacion IA"""
    desarrollo_id: Optional[str] = None
    tipo_recomendacion: str
    titulo: str
    descripcion: str
    prioridad: str = "media"
    puntaje_impacto: Optional[Decimal] = None
    puntaje_esfuerzo: Optional[Decimal] = None
    confianza_ia: Optional[Decimal] = None
    estado: str = "pendiente"
    asignado_a: Optional[str] = None
    fecha_limite: Optional[date] = None
    notas_implementacion: Optional[str] = None
    generado_por: str


class SolicitudAnalisisIA(SQLModel):
    """Schema para solicitar un analisis a la IA"""
    desarrollo_id: str
    pregunta: str
    incluir_historial: bool = True
