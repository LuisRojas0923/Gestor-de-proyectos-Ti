"""
Schemas de Autenticacin - Backend V2
"""
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class Token(BaseModel):
    """Schema para el token de acceso"""
    access_token: str
    token_type: str


class DatosToken(BaseModel):
    """Schema para los datos contenidos en el token"""
    usuario_id: Optional[str] = None


class UsuarioBase(BaseModel):
    """Schema base para usuario"""
    id: str = Field(..., max_length=50)
    cedula: str = Field(..., max_length=50)
    correo: Optional[EmailStr] = None
    nombre: str = Field(..., max_length=255)
    rol: str = Field("usuario", max_length=50)
    esta_activo: bool = True
    url_avatar: Optional[str] = None
    zona_horaria: str = "America/Bogota"


class UsuarioCrear(UsuarioBase):
    """Schema para crear un usuario"""
    contrasena: str = Field(..., min_length=8)


class UsuarioActualizar(BaseModel):
    """Schema para actualizar un usuario"""
    correo: Optional[EmailStr] = None
    nombre: Optional[str] = None
    contrasena: Optional[str] = None
    esta_activo: Optional[bool] = None
    url_avatar: Optional[str] = None


class Usuario(UsuarioBase):
    """Schema completo de usuario (respuesta)"""
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    ultimo_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Schema para la solicitud de login"""
    cedula: str
    contrasena: str
