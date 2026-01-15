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
    development_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    metric_type = Column(String(100), nullable=False)  # 'cumplimiento_fechas', 'calidad_primera_entrega', etc.
    provider = Column(String(100))
    period_start = Column(Date)
    period_end = Column(Date)
    value = Column(DECIMAL(10, 2))
    target_value = Column(DECIMAL(10, 2))
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    calculated_by = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="kpi_metrics")


class DevelopmentFunctionality(Base):
    __tablename__ = "funcionalidades_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    functionality_name = Column(String(255), nullable=False)
    functionality_code = Column(String(100))
    description = Column(Text)
    status = Column(String(50), default="delivered")  # 'delivered', 'pending', 'rejected', 'in_progress'
    delivery_date = Column(Date)
    defects_count = Column(Integer, default=0)
    test_coverage_percentage = Column(DECIMAL(5, 2))
    complexity_level = Column(String(20), default="medium")  # 'low', 'medium', 'high', 'critical'
    estimated_hours = Column(DECIMAL(8, 2))
    actual_hours = Column(DECIMAL(8, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="functionalities")
    test_results = relationship("DevelopmentTestResult", back_populates="functionality")


class DevelopmentQualityMetric(Base):
    __tablename__ = "metricas_calidad_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    provider = Column(String(100))
    metric_type = Column(String(100), nullable=False)  # 'first_time_quality', 'defects_per_delivery', etc.
    metric_name = Column(String(255), nullable=False)
    value = Column(DECIMAL(10, 2))
    target_value = Column(DECIMAL(10, 2))
    unit = Column(String(20), default="percentage")  # 'percentage', 'hours', 'count', 'days'
    calculation_method = Column(String(100))
    period_start = Column(Date)
    period_end = Column(Date)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    calculated_by = Column(String(255))
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="quality_metrics")


class DevelopmentTestResult(Base):
    __tablename__ = "resultados_pruebas_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    functionality_id = Column(Integer, ForeignKey("funcionalidades_desarrollo.id"))
    test_type = Column(String(50), nullable=False)  # 'unit', 'integration', 'system', 'user_acceptance'
    test_phase = Column(String(50))  # 'development', 'testing', 'pre_production', 'production'
    test_date = Column(Date)
    test_status = Column(String(50))  # 'passed', 'failed', 'blocked', 'not_executed'
    defects_found = Column(Integer, default=0)
    defects_severity = Column(String(50))  # 'low', 'medium', 'high', 'critical'
    test_coverage = Column(DECIMAL(5, 2))
    execution_time_hours = Column(DECIMAL(8, 2))
    tester_name = Column(String(255))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="test_results")
    functionality = relationship("DevelopmentFunctionality", back_populates="test_results")


class DevelopmentDeliveryHistory(Base):
    __tablename__ = "historial_entregas_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    delivery_version = Column(String(50))
    delivery_type = Column(String(50))  # 'initial', 'revision', 'fix', 'final'
    delivery_date = Column(Date)
    delivery_status = Column(String(50))  # 'delivered', 'returned', 'accepted', 'rejected'
    return_reason = Column(Text)
    return_count = Column(Integer, default=0)
    approval_date = Column(Date)
    approved_by = Column(String(255))
    quality_score = Column(DECIMAL(5, 2))
    defects_reported = Column(Integer, default=0)
    defects_resolved = Column(Integer, default=0)
    delivery_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="delivery_history")
