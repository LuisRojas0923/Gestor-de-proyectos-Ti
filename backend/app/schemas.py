from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    avatar: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    avatar: Optional[str] = None

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Requirement schemas
class RequirementBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    type: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[datetime] = None
    sla_hours: Optional[float] = None

class RequirementCreate(RequirementBase):
    external_id: Optional[str] = None
    assigned_user_id: Optional[int] = None
    status: str = 'new'

class RequirementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    assigned_user_id: Optional[int] = None
    due_date: Optional[datetime] = None
    sla_hours: Optional[float] = None

class Requirement(RequirementBase):
    id: int
    external_id: Optional[str]
    status: str
    assigned_user_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Communication schemas
class CommunicationBase(BaseModel):
    type: str
    subject: str
    content: str
    recipient: str

class CommunicationCreate(CommunicationBase):
    requirement_id: int

class CommunicationUpdate(BaseModel):
    subject: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None

class Communication(CommunicationBase):
    id: int
    requirement_id: int
    sent_at: datetime
    status: str
    
    class Config:
        from_attributes = True

# Project schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class Project(ProjectBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Dashboard schemas
class DashboardMetrics(BaseModel):
    total_requirements: int
    pending_requirements: int
    in_progress_requirements: int
    completed_requirements: int
    avg_sla_hours: float
    overdue_requirements: int

class WeeklyProgress(BaseModel):
    date: str
    completed: int
    created: int

class PriorityDistribution(BaseModel):
    priority: str
    count: int
    percentage: float

# Development schemas
class DevelopmentBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    module: Optional[str] = None
    type: Optional[str] = None
    start_date: Optional[datetime] = None
    estimated_end_date: Optional[datetime] = None
    target_closure_date: Optional[datetime] = None
    estimated_days: Optional[int] = None
    main_responsible: Optional[str] = None
    provider: Optional[str] = None
    requesting_area: Optional[str] = None
    general_status: Optional[str] = "Pendiente"
    current_stage: Optional[str] = None
    observations: Optional[str] = None
    estimated_cost: Optional[float] = None
    proposal_number: Optional[str] = None
    environment: Optional[str] = None
    remedy_link: Optional[str] = None
    scheduled_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    returns_count: Optional[int] = 0
    test_defects_count: Optional[int] = 0

class DevelopmentCreate(DevelopmentBase):
    pass

class DevelopmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    module: Optional[str] = None
    type: Optional[str] = None
    start_date: Optional[datetime] = None
    estimated_end_date: Optional[datetime] = None
    target_closure_date: Optional[datetime] = None
    estimated_days: Optional[int] = None
    main_responsible: Optional[str] = None
    provider: Optional[str] = None
    requesting_area: Optional[str] = None
    general_status: Optional[str] = None
    current_stage: Optional[str] = None
    observations: Optional[str] = None
    estimated_cost: Optional[float] = None
    proposal_number: Optional[str] = None
    environment: Optional[str] = None
    remedy_link: Optional[str] = None
    scheduled_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    returns_count: Optional[int] = None
    test_defects_count: Optional[int] = None

class Development(DevelopmentBase):
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True