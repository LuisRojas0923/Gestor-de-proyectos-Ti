from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, text
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

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

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)
    latitud: float
    longitud: float
    radio: float = Field(default=100.0) # Metros

class RegistroAsistencia(SQLModel, table=True):
    __tablename__ = "registros_asistencia"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: str = Field(foreign_key="usuarios.id", index=True, max_length=50)
    zona_id: Optional[int] = Field(default=None, foreign_key="zonas_trabajo.id")
    
    match_exitoso: bool = Field(default=False)
    nivel_confianza: float = Field(default=0.0)
    latitud_marcada: float
    longitud_marcada: float
    evidencia_url: Optional[str] = Field(default=None, max_length=255)
    
    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": text("now()")}
    )
