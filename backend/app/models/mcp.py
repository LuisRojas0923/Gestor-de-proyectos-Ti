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
    __tablename__ = "cache_contexto_ia"
    
    id = Column(Integer, primary_key=True, index=True)
    clave_contexto = Column(String(255), unique=True, nullable=False, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"))
    tipo_contexto = Column(String(50), nullable=False)  # 'development', 'provider', 'kpi', 'quality'
    datos_contexto = Column(JSON, nullable=False)  # Contexto serializado
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    expira_en = Column(DateTime(timezone=True), nullable=False)
    conteo_accesos = Column(Integer, default=0)
    ultimo_acceso_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="cache_contexto_ia")


class AiAnalysisHistory(Base):
    """Historial de análisis realizados por IA"""
    __tablename__ = "historial_analisis_ia"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"))
    tipo_analisis = Column(String(100), nullable=False)  # 'risk_analysis', 'performance_review', 'prediction'
    texto_consulta = Column(Text, nullable=False)  # Pregunta original del usuario
    contexto_usado = Column(JSON)  # Contexto que se envió a la IA
    respuesta_ia = Column(Text, nullable=False)  # Respuesta de la IA
    modelo_ia = Column(String(50), nullable=False)  # 'claude-3-sonnet', 'gpt-4', etc.
    tokens_usados = Column(Integer)  # Tokens consumidos
    tiempo_respuesta_ms = Column(Integer)  # Tiempo de respuesta en ms
    usuario_id = Column(String(50), ForeignKey("usuarios_autenticacion.id"))  # Usuario que hizo la consulta
    puntaje_confianza = Column(DECIMAL(3, 2))  # Confianza de la IA (0-1)
    fue_util = Column(Boolean)  # Feedback del usuario
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="historial_analisis_ia")
    usuario = relationship("AuthUser", back_populates="historial_analisis_ia")


class AiRecommendation(Base):
    """Recomendaciones generadas por IA"""
    __tablename__ = "recomendaciones_ia"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"))
    tipo_recomendacion = Column(String(100), nullable=False)  # 'process_improvement', 'risk_mitigation', 'timeline_optimization'
    titulo = Column(String(255), nullable=False)  # Título de la recomendación
    descripcion = Column(Text, nullable=False)  # Descripción detallada
    prioridad = Column(String(20), default="medium")  # 'low', 'medium', 'high', 'critical'
    puntaje_impacto = Column(DECIMAL(3, 2))  # Impacto esperado (0-1)
    puntaje_esfuerzo = Column(DECIMAL(3, 2))  # Esfuerzo requerido (0-1)
    confianza_ia = Column(DECIMAL(3, 2))  # Confianza de la IA (0-1)
    estado = Column(String(50), default="pending")  # 'pending', 'accepted', 'rejected', 'implemented'
    notas_implementacion = Column(Text)  # Notas de implementación
    asignado_a = Column(String(255))  # Responsable de implementar
    fecha_limite = Column(Date)  # Fecha límite sugerida
    implementado_en = Column(DateTime(timezone=True))  # Fecha de implementación
    retroalimentacion_resultados = Column(Text)  # Feedback de resultados
    generado_por = Column(String(50), nullable=False)  # Modelo de IA que generó
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="recomendaciones_ia")


class AiUsageMetric(Base):
    """Métricas de uso y costos de IA"""
    __tablename__ = "metricas_uso_ia"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(String(50), ForeignKey("usuarios_autenticacion.id"))  # Usuario (puede ser NULL para métricas del sistema)
    modelo_ia = Column(String(50), nullable=False)  # Modelo de IA usado
    tipo_operacion = Column(String(100), nullable=False)  # 'analysis', 'chat', 'recommendation', 'prediction'
    tokens_entrada = Column(Integer, default=0)  # Tokens de entrada
    tokens_salida = Column(Integer, default=0)  # Tokens de salida
    costo_estimado = Column(DECIMAL(10, 4))  # Costo estimado en USD
    tiempo_respuesta_ms = Column(Integer)  # Tiempo de respuesta
    exito = Column(Boolean, default=True)  # Si la operación fue exitosa
    mensaje_error = Column(Text)  # Mensaje de error si falló
    tamano_contexto = Column(Integer)  # Tamaño del contexto enviado
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    particion_fecha = Column(Date, server_default=func.current_date())  # Para particionado por fecha
    
    # Relaciones
    usuario = relationship("AuthUser", back_populates="metricas_uso_ia")


class AiModelConfig(Base):
    """Configuraciones de modelos de IA disponibles"""
    __tablename__ = "configuraciones_modelo_ia"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre_modelo = Column(String(50), unique=True, nullable=False)  # 'claude-3-sonnet', 'gpt-4', etc.
    proveedor = Column(String(50), nullable=False)  # 'anthropic', 'openai'
    esta_activo = Column(Boolean, default=True)  # Si el modelo está activo
    max_tokens = Column(Integer, default=4000)  # Máximo de tokens por request
    temperatura = Column(DECIMAL(3, 2), default=0.7)  # Temperatura del modelo
    costo_por_token_entrada = Column(DECIMAL(10, 8))  # Costo por token de entrada
    costo_por_token_salida = Column(DECIMAL(10, 8))  # Costo por token de salida
    limite_tasa_por_minuto = Column(Integer, default=60)  # Límite de requests por minuto
    ventana_contexto = Column(Integer, default=200000)  # Ventana de contexto del modelo
    especializacion = Column(Text)  # Especialización del modelo
    configuracion = Column(JSON)  # Configuración específica del modelo
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
