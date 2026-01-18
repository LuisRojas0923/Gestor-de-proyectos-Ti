"""
Modelos de IA/MCP - Backend V2
"""
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Boolean, DECIMAL, Date
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base


class CacheContextoIA(Base):
    """Cache de contexto para IA"""
    __tablename__ = "cache_contexto_ia"
    
    id = Column(Integer, primary_key=True, index=True)
    clave_contexto = Column(String(255), unique=True, nullable=False)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"))
    tipo_contexto = Column(String(50), nullable=False)
    datos_contexto = Column(JSONB, nullable=False)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    conteo_accesos = Column(Integer, default=0)
    ultimo_acceso_en = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class HistorialAnalisisIA(Base):
    """Historial de analisis realizados por IA"""
    __tablename__ = "historial_analisis_ia"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"))
    tipo_analisis = Column(String(100), nullable=False)
    texto_consulta = Column(Text, nullable=False)
    contexto_usado = Column(JSONB)
    respuesta_ia = Column(Text, nullable=False)
    modelo_ia = Column(String(50), nullable=False)
    tokens_usados = Column(Integer)
    tiempo_respuesta_ms = Column(Integer)
    usuario_id = Column(String(50))
    puntaje_confianza = Column(DECIMAL(3, 2))
    fue_util = Column(Boolean)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class RecomendacionIA(Base):
    """Recomendaciones generadas por IA"""
    __tablename__ = "recomendaciones_ia"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"))
    tipo_recomendacion = Column(String(100), nullable=False)
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=False)
    prioridad = Column(String(20), default="media")
    puntaje_impacto = Column(DECIMAL(3, 2))
    puntaje_esfuerzo = Column(DECIMAL(3, 2))
    confianza_ia = Column(DECIMAL(3, 2))
    estado = Column(String(50), default="pendiente")
    asignado_a = Column(String(255))
    fecha_limite = Column(Date)
    notas_implementacion = Column(Text)
    implementado_en = Column(DateTime(timezone=True))
    retroalimentacion_resultados = Column(Text)
    generado_por = Column(String(50), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
