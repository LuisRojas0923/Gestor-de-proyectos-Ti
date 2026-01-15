from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# Category Schemas
class TicketCategoryBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    form_type: str

class TicketCategoryCreate(TicketCategoryBase):
    pass

class TicketCategory(TicketCategoryBase):
    created_at: datetime
    
    class Config:
        orm_mode = True

# Ticket Schemas
class SupportTicketBase(BaseModel):
    category_id: str
    subject: str
    description: str
    priority: str = "Media"
    
    # Datos del Solicitante
    creator_id: str
    creator_name: Optional[str] = None
    creator_email: Optional[EmailStr] = None
    creator_area: Optional[str] = None
    creator_cargo: Optional[str] = None
    creator_sede: Optional[str] = None
    
    ideal_delivery_date: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None
    development_id: Optional[str] = None

class SupportTicketCreate(SupportTicketBase):
    pass

class SupportTicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    diagnostic: Optional[str] = None
    resolution: Optional[str] = None
    notes: Optional[str] = None
    time_spent_hours: Optional[Decimal] = None
    close_date: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None
    development_id: Optional[str] = None

class SupportTicket(SupportTicketBase):
    id: str
    status: str
    assigned_to: Optional[str]
    diagnostic: Optional[str]
    resolution: Optional[str]
    notes: Optional[str]
    time_spent_hours: Optional[Decimal]
    development_id: Optional[str]
    resolved_at: Optional[datetime]
    creation_date: datetime
    close_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Comment Schemas
class TicketCommentBase(BaseModel):
    comment: str
    is_internal: bool = False

class TicketCommentCreate(TicketCommentBase):
    ticket_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None

class TicketComment(TicketCommentBase):
    id: int
    ticket_id: str
    user_id: Optional[str]
    user_name: Optional[str]
    created_at: datetime
    
    class Config:
        orm_mode = True
