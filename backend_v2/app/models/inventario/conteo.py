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
    
    # Control de Estado e Inteligencia
    estado: str = Field(default="PENDIENTE", max_length=20) # PENDIENTE, CONCILIADO, DISCREPANTE
    diferencia: float = Field(default=0.0) # Diferencia local de la ubicación
    invporlegalizar: float = Field(default=0.0)
    
    # --- Nuevos campos analíticos persistentes ---
    cantidad_final: float = Field(default=0.0) # Cantidad Sistema + Inv. Por Legalizar
    diferencia_total: float = Field(default=0.0) # Diferencia Global del código (Balance Multi-ubicación)
    
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
    estante: str = Field(max_length=255)
    nivel: str = Field(max_length=50)
    cedula: str = Field(max_length=50)
    nombre: str = Field(max_length=255)
    cedula_companero: Optional[str] = Field(default=None, max_length=50)
    nombre_companero: Optional[str] = Field(default=None, max_length=255)
    numero_pareja: Optional[int] = Field(default=None)
    cargo: str = Field(max_length=100)
    creado_en: datetime = Field(
        default_factory=datetime.now,
        sa_column_kwargs={"server_default": text("now()")}
    )

class TransitoInventario(SQLModel, table=True):
    """Modelo para registro de documentos individuales en tránsito (Modelo B)"""
    __tablename__ = "transitoinventario"

    id: Optional[int] = Field(default=None, primary_key=True)
    sku: str = Field(max_length=100, index=True)
    documento: str = Field(max_length=100) # Factura, remisión, etc.
    cantidad: float = Field(default=0.0)
    fecha_proceso: datetime = Field(
        default_factory=datetime.utcnow,
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

class ConteoHistorico(SQLModel, table=True):
    """Respaldo historico de una toma de inventario (Snapshot)"""
    __tablename__ = "conteohistorico"

    id: Optional[int] = Field(default=None, primary_key=True)
    original_id: Optional[int] = Field(default=None) # ID en la tabla original
    
    # Copia de campos de ConteoInventario
    b_siigo: Optional[int] = Field(default=None)
    bodega: str = Field(max_length=100)
    bloque: str = Field(max_length=50)
    estante: str = Field(max_length=50)
    nivel: str = Field(max_length=50)
    codigo: str = Field(max_length=100)
    descripcion: str = Field(max_length=255)
    unidad: str = Field(max_length=20)
    cantidad_sistema: float = Field(default=0.0)
    
    cant_c1: float = Field(default=0.0)
    cant_c2: float = Field(default=0.0)
    cant_c3: float = Field(default=0.0)
    cant_c4: float = Field(default=0.0)
    
    conteo: str = Field(max_length=100)
    estado: str = Field(max_length=20)
    invporlegalizar: float = Field(default=0.0)
    cantidad_final: float = Field(default=0.0)
    diferencia_total: float = Field(default=0.0)
    
    snapshot_at: datetime = Field(
        default_factory=datetime.now,
        sa_column_kwargs={"server_default": text("now()")}
    )
