from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, text
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

# NOTA: En este entorno de pruebas simulamos la tabla 'usuarios' que existe en el proyecto principal
class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"
    id: str = Field(primary_key=True, max_length=50)
    username: Optional[str] = Field(default=None, max_length=50, unique=True, index=True)
    password_hash: Optional[str] = Field(default=None, max_length=255)
    nombre: str = Field(max_length=255)
    rol: str = Field(default="usuario", max_length=50)

class EmbeddingFacial(SQLModel, table=True):
    __tablename__ = "embeddings_faciales"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: str = Field(foreign_key="usuarios.id", unique=True, max_length=50)
    embedding: list = Field(sa_column=Column(JSONB))
    
    activo: bool = Field(default=True)
    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": text("now()")}
    )

class ZonaTrabajo(SQLModel, table=True):
    __tablename__ = "zonas_trabajo"

    id: str = Field(primary_key=True, max_length=50)
    nombre: str = Field(max_length=100)
    latitud: Optional[float] = Field(default=0.0)
    longitud: Optional[float] = Field(default=0.0)
    radio: float = Field(default=100.0)

class RegistroAsistencia(SQLModel, table=True):
    __tablename__ = "registros_asistencia"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: str = Field(foreign_key="usuarios.id", index=True, max_length=50)
    zona_id: Optional[str] = Field(default=None, foreign_key="zonas_trabajo.id", max_length=50)
    
    match_exitoso: bool = Field(default=False)
    nivel_confianza: float = Field(default=0.0)
    latitud_marcada: Optional[float] = Field(default=0.0)
    longitud_marcada: Optional[float] = Field(default=0.0)
    
    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": text("now()")}
    )
