"""
Modelos de Autenticacion - Backend V2 (SQLModel)
Unifica modelos y schemas en una sola definicion
"""
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship


# --- Modelos de Base de Datos (table=True) ---

class Usuario(SQLModel, table=True):
    """Modelo de usuario del sistema"""
    __tablename__ = "usuarios"
    
    id: str = Field(primary_key=True, max_length=50)
    cedula: str = Field(unique=True, index=True, max_length=50)
    correo: Optional[str] = Field(default=None, unique=True, index=True, max_length=255)
    hash_contrasena: str = Field(max_length=255)
    nombre: str = Field(max_length=255)
    rol: str = Field(default="usuario", max_length=50)
    esta_activo: bool = Field(default=True)
    url_avatar: Optional[str] = Field(default=None, max_length=500)
    zona_horaria: str = Field(default="America/Bogota", max_length=50)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)
    ultimo_login: Optional[datetime] = Field(default=None)
    
    # Datos de perfil (Sincronizados con ERP)
    area: Optional[str] = Field(default=None, max_length=255)
    cargo: Optional[str] = Field(default=None, max_length=255)
    sede: Optional[str] = Field(default=None, max_length=255)
    centrocosto: Optional[str] = Field(default=None, max_length=255)
    
    # Datos de viáticos (Solid ERP)
    viaticante: bool = Field(default=False)
    baseviaticos: Optional[float] = Field(default=None)
    # Nuevos campos para ruteo inteligente
    especialidades: Optional[str] = Field(default="[]", max_length=500)  # Lista JSON: ["soporte", "desarrollo"]
    areas_asignadas: Optional[str] = Field(default="[]", max_length=1000) # Lista JSON de áreas
    
    # Relaciones
    tokens: List["Token"] = Relationship(back_populates="usuario", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    sesiones: List["Sesion"] = Relationship(back_populates="usuario", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class Token(SQLModel, table=True):
    """Modelo de tokens de autenticacion"""
    __tablename__ = "tokens"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: str = Field(foreign_key="usuarios.id", max_length=50)
    hash_token: str = Field(max_length=255)
    tipo_token: str = Field(max_length=50)  # 'access', 'refresh'
    nombre: Optional[str] = Field(default=None, max_length=255)
    expira_en: datetime
    ultimo_uso_en: Optional[datetime] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    # Relaciones
    usuario: Optional[Usuario] = Relationship(back_populates="tokens")


class Sesion(SQLModel, table=True):
    """Modelo de sesiones de usuario"""
    __tablename__ = "sesiones"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: str = Field(foreign_key="usuarios.id", max_length=50)
    token_sesion: str = Field(unique=True, max_length=255)
    direccion_ip: Optional[str] = Field(default=None, max_length=45)
    agente_usuario: Optional[str] = Field(default=None)
    expira_en: datetime
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    # Relaciones
    usuario: Optional[Usuario] = Relationship(back_populates="sesiones")


class PermisoRol(SQLModel, table=True):
    """Modelo para gestionar permisos de acceso por rol y módulo"""
    __tablename__ = "permisos_rol"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    rol: str = Field(index=True, max_length=50) # 'admin', 'analyst', 'user', 'director'
    modulo: str = Field(index=True, max_length=100) # ID del componente/pantalla
    permitido: bool = Field(default=True)


# --- Schemas de Validacion (table=False, por defecto) ---

class UsuarioCrear(SQLModel):
    """Schema para crear un usuario"""
    id: str = Field(max_length=50)
    cedula: str = Field(max_length=50)
    correo: Optional[str] = None
    nombre: str = Field(max_length=255)
    rol: str = Field(default="usuario", max_length=50)
    esta_activo: bool = True
    url_avatar: Optional[str] = None
    zona_horaria: str = "America/Bogota"
    contrasena: str = Field(min_length=8)


class UsuarioActualizar(SQLModel):
    """Schema para actualizar un usuario"""
    correo: Optional[str] = None
    nombre: Optional[str] = None
    contrasena: Optional[str] = None
    esta_activo: Optional[bool] = None
    url_avatar: Optional[str] = None


class UsuarioPublico(SQLModel):
    """Schema publico de usuario (respuesta)"""
    id: str
    cedula: str
    correo: Optional[str] = None
    nombre: str
    rol: str
    esta_activo: bool
    url_avatar: Optional[str] = None
    zona_horaria: str
    creado_en: Optional[datetime] = None
    actualizado_en: Optional[datetime] = None
    ultimo_login: Optional[datetime] = None
    area: Optional[str] = None
    cargo: Optional[str] = None
    sede: Optional[str] = None
    centrocosto: Optional[str] = None
    viaticante: bool = False
    baseviaticos: Optional[float] = None
    especialidades: Optional[str] = "[]"
    areas_asignadas: Optional[str] = "[]"


class TokenRespuesta(SQLModel):
    """Schema para el token de acceso"""
    access_token: str
    token_type: str


class DatosToken(SQLModel):
    """Schema para los datos contenidos en el token"""
    usuario_id: Optional[str] = None


class LoginRequest(SQLModel):
    """Schema para la solicitud de login"""
    cedula: str
    contrasena: str


class AnalistaCrear(SQLModel):
    """Schema para solicitar la creacion de un analista desde ERP"""
    cedula: str = Field(max_length=50)


class PasswordCambiar(SQLModel):
    """Schema para cambiar la contrasena"""
    contrasena_actual: str
    nueva_contrasena: str = Field(min_length=8)
