"""
Modelos de Notificaciones de Usuario - Backend V2 (SQLModel)
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import text

class NotificacionUsuario(SQLModel, table=True):
    """Notificación persistente vinculada al usuario"""

    __tablename__ = "notificaciones_usuario"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: str = Field(foreign_key="usuarios.id", max_length=50)
    titulo: str = Field(max_length=255)
    mensaje: str
    leido: bool = Field(default=False)
    tipo_evento: str = Field(max_length=50)
    referencia_id: Optional[str] = Field(default=None, max_length=100)
    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": text("now()")}
    )

class NotificacionUsuarioCrear(SQLModel):
    """Schema para crear una notificación"""
    usuario_id: str
    titulo: str
    mensaje: str
    tipo_evento: str
    referencia_id: Optional[str] = None

class NotificacionUsuarioActualizar(SQLModel):
    """Schema para actualizar estado de la notificación"""
    leido: bool
