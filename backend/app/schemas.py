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
