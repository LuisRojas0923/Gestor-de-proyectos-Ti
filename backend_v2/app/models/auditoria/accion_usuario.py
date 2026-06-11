"""Modelo y schemas para auditoría transversal de acciones de usuario."""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import Column, Index, SmallInteger, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel, text


class AccionAuditoria(str, Enum):
    CREAR = "crear"
    ACTUALIZAR = "actualizar"
    ELIMINAR = "eliminar"
    CONSULTAR = "consultar"
    EXPORTAR = "exportar"
    LOGIN = "login"
    LOGOUT = "logout"
    OTRO = "otro"


class AuditoriaAccionUsuario(SQLModel, table=True):
    """Registro append-only de acciones realizadas por usuarios."""

    __tablename__ = "auditoria_acciones_usuario"
    __table_args__ = (
        Index("idx_aud_acc_usuario_ts", "usuario_id", "timestamp"),
        Index("idx_aud_acc_modulo_ts", "modulo", "timestamp"),
        Index("idx_aud_acc_entidad", "entidad_tipo", "entidad_id"),
        Index("idx_aud_acc_timestamp", "timestamp"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: Optional[datetime] = Field(
        default=None,
        sa_column_kwargs={"server_default": text("now()")},
    )
    usuario_id: str = Field(max_length=50, index=True)
    usuario_nombre: Optional[str] = Field(default=None, max_length=255)
    rol: Optional[str] = Field(default=None, max_length=50)
    modulo: str = Field(max_length=80)
    accion: str = Field(max_length=50)
    entidad_tipo: Optional[str] = Field(default=None, max_length=80)
    entidad_id: Optional[str] = Field(default=None, max_length=100)
    metodo_http: Optional[str] = Field(default=None, max_length=10)
    ruta: Optional[str] = Field(default=None, max_length=255)
    codigo_respuesta: Optional[int] = Field(
        default=None, sa_column=Column(SmallInteger, nullable=True)
    )
    resultado: str = Field(default="exito", max_length=20)
    direccion_ip: Optional[str] = Field(default=None, max_length=45)
    agente_usuario: Optional[str] = Field(default=None, sa_column=Column(Text))
    correlacion_id: Optional[str] = Field(default=None, max_length=36)
    datos_anteriores: Optional[Dict[str, Any]] = Field(
        default=None, sa_column=Column(JSONB)
    )
    datos_nuevos: Optional[Dict[str, Any]] = Field(
        default=None, sa_column=Column(JSONB)
    )
    metadatos: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))


class AuditoriaAccionPublica(SQLModel):
    """Schema de lectura para la API."""

    id: int
    timestamp: Optional[datetime] = None
    usuario_id: str
    usuario_nombre: Optional[str] = None
    rol: Optional[str] = None
    modulo: str
    accion: str
    entidad_tipo: Optional[str] = None
    entidad_id: Optional[str] = None
    metodo_http: Optional[str] = None
    ruta: Optional[str] = None
    codigo_respuesta: Optional[int] = None
    resultado: str
    direccion_ip: Optional[str] = None
    agente_usuario: Optional[str] = None
    correlacion_id: Optional[str] = None
    datos_anteriores: Optional[Dict[str, Any]] = None
    datos_nuevos: Optional[Dict[str, Any]] = None
    metadatos: Optional[Dict[str, Any]] = None


class AuditoriaEventosPaginados(SQLModel):
    items: List[AuditoriaAccionPublica]
    total: int
    page: int
    page_size: int
