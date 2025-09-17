"""
Modelos de desarrollos, fases y etapas
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, DECIMAL, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DevelopmentPhase(Base):
    __tablename__ = "development_phases"
    
    id = Column(Integer, primary_key=True, index=True)
    phase_name = Column(String(100), nullable=False)  # 'En Ejecución', 'En Espera', 'Finales / Otros'
    phase_description = Column(Text)
    phase_color = Column(String(20))  # 'info', 'warning', 'success'
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    stages = relationship("DevelopmentStage", back_populates="phase", cascade="all, delete-orphan")
    developments = relationship("Development", back_populates="current_phase")


class DevelopmentStage(Base):
    __tablename__ = "development_stages"
    
    id = Column(Integer, primary_key=True, index=True)
    phase_id = Column(Integer, ForeignKey("development_phases.id"), nullable=False)
    stage_code = Column(String(20), nullable=False)  # '0', '1', '2', '3', etc.
    stage_name = Column(String(255), nullable=False)  # Nombre amigable de la etapa
    stage_description = Column(Text)
    is_milestone = Column(Boolean, default=False)
    estimated_days = Column(Integer)
    responsible_party = Column(String(100))  # 'proveedor', 'usuario', 'equipo_interno'
    sort_order = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    phase = relationship("DevelopmentPhase", back_populates="stages")
    developments = relationship("Development", back_populates="current_stage")


class Development(Base):
    __tablename__ = "developments"
    
    id = Column(String(50), primary_key=True)  # No.Remedy
    name = Column(String(255), nullable=False)
    description = Column(Text)
    module = Column(String(100))
    type = Column(String(50))  # 'Desarrollo', 'Consulta'
    environment = Column(String(100))
    remedy_link = Column(Text)
    
    # CAMPOS PARA CICLO DE DESARROLLO
    current_phase_id = Column(Integer, ForeignKey("development_phases.id"))
    current_stage_id = Column(Integer, ForeignKey("development_stages.id"))
    stage_progress_percentage = Column(DECIMAL(5, 2), default=0.0)
    
    # CAMPOS LEGACY PARA COMPATIBILIDAD CON CRUD.PY
    general_status = Column(String(50), default="Pendiente")  # 'Pendiente', 'En curso', 'Completado'
    estimated_end_date = Column(Date)  # Fecha estimada de finalización
    provider = Column(String(100))  # Proveedor principal
    responsible = Column(String(255))  # Responsable principal del desarrollo
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    current_phase = relationship("DevelopmentPhase", back_populates="developments")
    current_stage = relationship("DevelopmentStage", back_populates="developments")
    dates = relationship("DevelopmentDate", back_populates="development", cascade="all, delete-orphan")
    proposals = relationship("DevelopmentProposal", back_populates="development", cascade="all, delete-orphan")
    installers = relationship("DevelopmentInstaller", back_populates="development", cascade="all, delete-orphan")
    providers = relationship("DevelopmentProvider", back_populates="development", cascade="all, delete-orphan")
    responsibles = relationship("DevelopmentResponsible", back_populates="development", cascade="all, delete-orphan")
    status_history = relationship("DevelopmentStatusHistory", back_populates="development", cascade="all, delete-orphan")
    observations = relationship("DevelopmentObservation", back_populates="development", cascade="all, delete-orphan")
    upcoming_activities = relationship("DevelopmentUpcomingActivity", back_populates="development", cascade="all, delete-orphan")
    kpi_metrics = relationship("DevelopmentKpiMetric", back_populates="development", cascade="all, delete-orphan")
    quality_controls = relationship("DevelopmentQualityControl", back_populates="development", cascade="all, delete-orphan")
    functionalities = relationship("DevelopmentFunctionality", back_populates="development", cascade="all, delete-orphan")
    quality_metrics = relationship("DevelopmentQualityMetric", back_populates="development", cascade="all, delete-orphan")
    test_results = relationship("DevelopmentTestResult", back_populates="development", cascade="all, delete-orphan")
    delivery_history = relationship("DevelopmentDeliveryHistory", back_populates="development", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="development", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="development", cascade="all, delete-orphan")
    
    # Relaciones MCP (IA)
    ai_context_cache = relationship("AiContextCache", back_populates="development", cascade="all, delete-orphan")
    ai_analysis_history = relationship("AiAnalysisHistory", back_populates="development", cascade="all, delete-orphan")
    ai_recommendations = relationship("AiRecommendation", back_populates="development", cascade="all, delete-orphan")


class DevelopmentDate(Base):
    __tablename__ = "development_dates"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    date_type = Column(String(50), nullable=False)  # 'inicio', 'fin_estimado', 'entrega', 'cierre', 'produccion'
    planned_date = Column(Date)
    actual_date = Column(Date)
    days_estimated = Column(Integer)
    days_actual = Column(Integer)
    
    # CAMPOS PARA INDICADORES DE CALIDAD
    delivery_status = Column(String(50))  # 'on_time', 'delayed', 'cancelled'
    approval_status = Column(String(50))  # 'approved_first_time', 'approved_with_returns', 'rejected'
    functionality_count = Column(Integer, default=0)
    production_deployment_date = Column(Date)
    delivery_compliance_score = Column(DECIMAL(5, 2))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="dates")


class DevelopmentProposal(Base):
    __tablename__ = "development_proposals"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    proposal_number = Column(String(100), nullable=False)
    cost = Column(DECIMAL(15, 2))
    status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="proposals")


class DevelopmentInstaller(Base):
    __tablename__ = "development_installers"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    installer_number = Column(String(100))
    version = Column(String(50))
    environment = Column(String(100))
    installation_date = Column(Date)
    status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="installers")


class DevelopmentProvider(Base):
    __tablename__ = "development_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    provider_name = Column(String(100), nullable=False)  # 'Ingesoft', 'ITC', 'TI'
    side_service_point = Column(String(100))  # SIDE/Service Point
    provider_system = Column(String(100))  # Sistema del proveedor
    status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="providers")


class DevelopmentResponsible(Base):
    __tablename__ = "development_responsibles"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    user_name = Column(String(255), nullable=False)
    role_type = Column(String(50), nullable=False)  # 'solicitante', 'tecnico', 'area'
    area = Column(String(100))
    is_primary = Column(Boolean, default=False)
    assigned_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="responsibles")


class DevelopmentStatusHistory(Base):
    __tablename__ = "development_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    status = Column(String(50), nullable=False)
    progress_stage = Column(String(100))
    change_date = Column(DateTime(timezone=True), server_default=func.now())
    changed_by = Column(String(255))
    previous_status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="status_history")


class DevelopmentObservation(Base):
    __tablename__ = "development_observations"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"), nullable=False)
    observation_type = Column(String(50), nullable=False)  # 'estado', 'seguimiento', 'problema', 'acuerdo'
    content = Column(Text, nullable=False)
    author = Column(String(255))
    observation_date = Column(DateTime(timezone=True), server_default=func.now())
    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    development = relationship("Development", back_populates="observations")
