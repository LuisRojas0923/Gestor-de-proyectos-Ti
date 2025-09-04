from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Development(Base):
    __tablename__ = "developments"
    
    id = Column(String(50), primary_key=True, index=True)  # No. Remedy
    name = Column(String(255), nullable=False)
    description = Column(Text)
    module = Column(String(100))
    type = Column(String(50))  # Consulta, Desarrollo, etc.
    
    # Timestamps & Schedule
    start_date = Column(DateTime)
    estimated_end_date = Column(DateTime)
    target_closure_date = Column(DateTime)
    estimated_days = Column(Integer)
    
    # Responsibles
    main_responsible = Column(String(100))
    provider = Column(String(100))
    requesting_area = Column(String(100))
    
    # Status & Progress
    general_status = Column(String(50), default='Pendiente')
    current_stage = Column(String(100)) # e.g., '2. Reunión de entendimiento'
    observations = Column(Text)
    
    # Financial & Technical
    estimated_cost = Column(Float)
    proposal_number = Column(String(100))
    environment = Column(String(100))
    remedy_link = Column(String(255))
    
    # Indicator-specific fields
    scheduled_delivery_date = Column(DateTime)
    actual_delivery_date = Column(DateTime)
    returns_count = Column(Integer, default=0)
    test_defects_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    activity_logs = relationship("ActivityLog", back_populates="development", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="development", cascade="all, delete-orphan")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"))
    date = Column(DateTime, default=datetime.utcnow)
    description = Column(Text, nullable=False)
    category = Column(String(100)) # e.g., 'Pruebas', 'Devolución', 'Reunión'
    
    development = relationship("Development", back_populates="activity_logs")

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    development_id = Column(String(50), ForeignKey("developments.id"))
    report_date = Column(DateTime, default=datetime.utcnow)
    resolution_date = Column(DateTime)
    description = Column(Text, nullable=False)
    
    development = relationship("Development", back_populates="incidents")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(50), nullable=False)
    avatar = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    requirements = relationship("Requirement", back_populates="assigned_user")

class Requirement(Base):
    __tablename__ = "requirements"
    
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(100), unique=True, index=True)  # ID from external platform
    title = Column(String(200), nullable=False)
    description = Column(Text)
    priority = Column(String(20), default="medium")  # low, medium, high, critical
    status = Column(String(20), default="pending")  # pending, in_progress, completed, cancelled
    type = Column(String(50))  # bug, feature, enhancement, etc.
    category = Column(String(50))
    assigned_user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    due_date = Column(DateTime)
    sla_hours = Column(Float)
    
    # Relationships
    assigned_user = relationship("User", back_populates="requirements")
