"""
Modelos de KPIs y métricas
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, DECIMAL, Date, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DevelopmentKpiMetric(Base):
    __tablename__ = "metricas_kpi_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    tipo_metrica = Column(String(100), nullable=False)  # 'cumplimiento_fechas', 'calidad_primera_entrega', etc.
    proveedor = Column(String(100))
    periodo_inicio = Column(Date)
    periodo_fin = Column(Date)
    valor = Column(DECIMAL(10, 2))
    valor_objetivo = Column(DECIMAL(10, 2))
    calculado_en = Column(DateTime(timezone=True), server_default=func.now())
    calculado_por = Column(String(255))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="metricas_kpi")


class DevelopmentFunctionality(Base):
    __tablename__ = "funcionalidades_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    nombre_funcionalidad = Column(String(255), nullable=False)
    codigo_funcionalidad = Column(String(100))
    descripcion = Column(Text)
    estado = Column(String(50), default="delivered")  # 'delivered', 'pending', 'rejected', 'in_progress'
    fecha_entrega = Column(Date)
    cantidad_defectos = Column(Integer, default=0)
    porcentaje_cobertura_pruebas = Column(DECIMAL(5, 2))
    nivel_complejidad = Column(String(20), default="medium")  # 'low', 'medium', 'high', 'critical'
    horas_estimadas = Column(DECIMAL(8, 2))
    horas_reales = Column(DECIMAL(8, 2))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="funcionalidades")
    resultados_pruebas = relationship("DevelopmentTestResult", back_populates="funcionalidad")


class DevelopmentQualityMetric(Base):
    __tablename__ = "metricas_calidad_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    proveedor = Column(String(100))
    tipo_metrica = Column(String(100), nullable=False)  # 'first_time_quality', 'defects_per_delivery', etc.
    nombre_metrica = Column(String(255), nullable=False)
    valor = Column(DECIMAL(10, 2))
    valor_objetivo = Column(DECIMAL(10, 2))
    unidad = Column(String(20), default="percentage")  # 'percentage', 'hours', 'count', 'days'
    metodo_calculo = Column(String(100))
    periodo_inicio = Column(Date)
    periodo_fin = Column(Date)
    calculado_en = Column(DateTime(timezone=True), server_default=func.now())
    calculado_por = Column(String(255))
    es_actual = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="metricas_calidad")


class DevelopmentTestResult(Base):
    __tablename__ = "resultados_pruebas_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    funcionalidad_id = Column(Integer, ForeignKey("funcionalidades_desarrollo.id"))
    tipo_prueba = Column(String(50), nullable=False)  # 'unit', 'integration', 'system', 'user_acceptance'
    fase_prueba = Column(String(50))  # 'development', 'testing', 'pre_production', 'production'
    fecha_prueba = Column(Date)
    estado_prueba = Column(String(50))  # 'passed', 'failed', 'blocked', 'not_executed'
    defectos_encontrados = Column(Integer, default=0)
    severidad_defectos = Column(String(50))  # 'low', 'medium', 'high', 'critical'
    cobertura_pruebas = Column(DECIMAL(5, 2))
    horas_ejecucion = Column(DECIMAL(8, 2))
    nombre_tester = Column(String(255))
    notas = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="resultados_pruebas")
    funcionalidad = relationship("DevelopmentFunctionality", back_populates="resultados_pruebas")


class DevelopmentDeliveryHistory(Base):
    __tablename__ = "historial_entregas_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    version_entrega = Column(String(50))
    tipo_entrega = Column(String(50))  # 'initial', 'revision', 'fix', 'final'
    fecha_entrega = Column(Date)
    estado_entrega = Column(String(50))  # 'delivered', 'returned', 'accepted', 'rejected'
    motivo_devolucion = Column(Text)
    cantidad_devoluciones = Column(Integer, default=0)
    fecha_aprobacion = Column(Date)
    aprobado_por = Column(String(255))
    puntaje_calidad = Column(DECIMAL(5, 2))
    defectos_reportados = Column(Integer, default=0)
    defectos_resueltos = Column(Integer, default=0)
    notas_entrega = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="historial_entregas")
