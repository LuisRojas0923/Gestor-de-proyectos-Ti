"""
Schemas legacy para compatibilidad hacia atrás
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Schema base para usuario legacy"""
    name: str = Field(..., max_length=255, description="Nombre del usuario")
    email: str = Field(..., max_length=255, description="Email del usuario")


class UserCreate(UserBase):
    """Schema para crear usuario legacy"""
    pass


class UserUpdate(BaseModel):
    """Schema para actualizar usuario legacy"""
    name: Optional[str] = Field(None, max_length=255, description="Nombre del usuario")
    email: Optional[str] = Field(None, max_length=255, description="Email del usuario")


class User(UserBase):
    """Schema completo para usuario legacy"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Schemas de Requirements eliminados - ya no se usan


class CommunicationBase(BaseModel):
    """Schema base para comunicación legacy"""
    development_id: str = Field(..., max_length=50, description="ID del desarrollo")
    message: str = Field(..., description="Mensaje de comunicación")
    sender: str = Field(..., max_length=255, description="Remitente")


class CommunicationCreate(CommunicationBase):
    """Schema para crear comunicación legacy"""
    pass


class CommunicationUpdate(BaseModel):
    """Schema para actualizar comunicación legacy"""
    message: Optional[str] = Field(None, description="Mensaje de comunicación")
    sender: Optional[str] = Field(None, max_length=255, description="Remitente")


class Communication(CommunicationBase):
    """Schema completo para comunicación legacy"""
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


# Schemas adicionales que usa crud.py
class ProjectBase(BaseModel):
    """Schema base para proyecto legacy"""
    name: str = Field(..., max_length=255, description="Nombre del proyecto")
    description: Optional[str] = Field(None, description="Descripción del proyecto")
    status: str = Field("active", max_length=50, description="Estado del proyecto")


class ProjectCreate(ProjectBase):
    """Schema para crear proyecto legacy"""
    pass


class ProjectUpdate(BaseModel):
    """Schema para actualizar proyecto legacy"""
    name: Optional[str] = Field(None, max_length=255, description="Nombre del proyecto")
    description: Optional[str] = Field(None, description="Descripción del proyecto")
    status: Optional[str] = Field(None, max_length=50, description="Estado del proyecto")


class Project(ProjectBase):
    """Schema completo para proyecto legacy"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
