from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, text

class ConteoInventario(SQLModel, table=True):
    """Modelo para registro de conteo fisico de inventario"""
    __tablename__ = "conteoinventario"

    id: Optional[int] = Field(default=None, primary_key=True)
    b_siigo: Optional[int] = Field(default=None)
    bodega: str = Field(max_length=100)
    bloque: str = Field(max_length=50)
    estante: str = Field(max_length=50)
    nivel: str = Field(max_length=50)
    codigo: str = Field(max_length=100)
    descripcion: str = Field(max_length=255)
    unidad: str = Field(max_length=20)
    
    cantidad_sistema: float = Field(default=0.0)
    
    # Rondos de Conteo
    cant_c1: float = Field(default=0.0)
    obs_c1: Optional[str] = Field(default=None)
    user_c1: Optional[str] = Field(default=None)
    
    cant_c2: float = Field(default=0.0)
    obs_c2: Optional[str] = Field(default=None)
    user_c2: Optional[str] = Field(default=None)
    
    cant_c3: float = Field(default=0.0)
    obs_c3: Optional[str] = Field(default=None)
    user_c3: Optional[str] = Field(default=None)
    
    cant_c4: float = Field(default=0.0)
    obs_c4: Optional[str] = Field(default=None)
    user_c4: Optional[str] = Field(default=None)

    conteo: str = Field(max_length=100) # Identificador de la toma física (ej: "Sede_Norte")
    fecha_creacion: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"server_default": text("now()")}
    )

class AsignacionInventario(SQLModel, table=True):
    """Modelo para asignar personal a ubicaciones fisicas de inventario"""
    __tablename__ = "asignacioninventario"

    id: Optional[int] = Field(default=None, primary_key=True)
    bodega: str = Field(max_length=100)
    bloque: str = Field(max_length=50)
    estante: str = Field(max_length=50)
    nivel: str = Field(max_length=50)
    cedula: str = Field(max_length=50)
    nombre: str = Field(max_length=255)
    cargo: str = Field(max_length=100)
    creado_en: datetime = Field(
        default_factory=datetime.now,
        sa_column_kwargs={"server_default": text("now()")}
    )

class ConfiguracionInventario(SQLModel, table=True):
    """Configuración global del módulo de inventario"""
    __tablename__ = "configuracioninventario"

    id: Optional[int] = Field(default=None, primary_key=True)
    ronda_activa: int = Field(default=1) # 1, 2, 3, 4
    conteo_nombre: Optional[str] = Field(default=None, max_length=100)
    ultima_actualizacion: datetime = Field(
        default_factory=datetime.now,
        sa_column_kwargs={"server_default": text("now()")}
    )
