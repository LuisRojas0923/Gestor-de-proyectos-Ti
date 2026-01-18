"""
Schemas de autenticación y usuarios
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


class AuthUserBase(BaseModel):
    correo: Optional[EmailStr] = None
    cedula: Optional[str] = Field(None, max_length=50)
    nombre: str = Field(..., min_length=1, max_length=255)
    rol: str = Field(default="user", max_length=50)
    esta_activo: bool = True
    correo_verificado: bool = False
    url_avatar: Optional[str] = Field(None, max_length=500)
    zona_horaria: str = Field(default="UTC", max_length=50)


class AuthUserCreate(AuthUserBase):
    contrasena: str = Field(..., min_length=8)


class AuthUserUpdate(BaseModel):
    correo: Optional[EmailStr] = None
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    rol: Optional[str] = Field(None, max_length=50)
    esta_activo: Optional[bool] = None
    correo_verificado: Optional[bool] = None
    url_avatar: Optional[str] = Field(None, max_length=500)
    zona_horaria: Optional[str] = Field(None, max_length=50)


class AuthUser(AuthUserBase):
    id: str
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    ultimo_login: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class AuthTokenBase(BaseModel):
    tipo_token: str = Field(..., max_length=50)
    nombre: Optional[str] = Field(None, max_length=255)
    expira_en: datetime


class AuthTokenCreate(AuthTokenBase):
    usuario_id: str


class AuthToken(AuthTokenBase):
    id: int
    usuario_id: str
    ultimo_uso_en: Optional[datetime] = None
    creado_en: datetime
    
    class Config:
        orm_mode = True


class UserSessionBase(BaseModel):
    direccion_ip: Optional[str] = Field(None, max_length=45)
    agente_usuario: Optional[str] = None
    expira_en: datetime


class UserSessionCreate(UserSessionBase):
    usuario_id: str
    token_sesion: str


class UserSession(UserSessionBase):
    id: int
    usuario_id: str
    token_sesion: str
    creado_en: datetime
    
    class Config:
        orm_mode = True


class PermissionBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None
    recurso: str = Field(..., max_length=100)
    accion: str = Field(..., max_length=50)


class PermissionCreate(PermissionBase):
    pass


class Permission(PermissionBase):
    id: int
    creado_en: datetime
    
    class Config:
        orm_mode = True


class LoginRequest(BaseModel):
    correo: EmailStr
    contrasena: str


class LoginResponse(BaseModel):
    token_acceso: str
    token_refresco: str
    tipo_token: str = "bearer"
    expira_en: int
    usuario: AuthUser


class RefreshTokenRequest(BaseModel):
    token_refresco: str


class ChangePasswordRequest(BaseModel):
    contrasena_actual: str
    nueva_contrasena: str = Field(..., min_length=8)
