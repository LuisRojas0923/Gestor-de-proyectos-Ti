"""
Schemas de autenticación y usuarios
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


class AuthUserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(default="user", max_length=50)
    is_active: bool = True
    email_verified: bool = False
    avatar_url: Optional[str] = Field(None, max_length=500)
    timezone: str = Field(default="UTC", max_length=50)


class AuthUserCreate(AuthUserBase):
    password: str = Field(..., min_length=8)


class AuthUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    email_verified: Optional[bool] = None
    avatar_url: Optional[str] = Field(None, max_length=500)
    timezone: Optional[str] = Field(None, max_length=50)


class AuthUser(AuthUserBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AuthTokenBase(BaseModel):
    token_type: str = Field(..., max_length=50)
    name: Optional[str] = Field(None, max_length=255)
    expires_at: datetime


class AuthTokenCreate(AuthTokenBase):
    user_id: str


class AuthToken(AuthTokenBase):
    id: int
    user_id: str
    last_used_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserSessionBase(BaseModel):
    ip_address: Optional[str] = Field(None, max_length=45)
    user_agent: Optional[str] = None
    expires_at: datetime


class UserSessionCreate(UserSessionBase):
    user_id: str
    session_token: str


class UserSession(UserSessionBase):
    id: int
    user_id: str
    session_token: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class PermissionBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    resource: str = Field(..., max_length=100)
    action: str = Field(..., max_length=50)


class PermissionCreate(PermissionBase):
    pass


class Permission(PermissionBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
