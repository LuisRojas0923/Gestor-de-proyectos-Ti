"""
Modelos de Nómina - Backend V2 (SQLModel)
"""
from typing import Optional, List, Any
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship, JSON, Column


class NominaArchivo(SQLModel, table=True):
    """Metadatos de archivos de nómina cargados"""
    __tablename__ = "nomina_archivos"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre_archivo: str = Field(max_length=255)
    hash_archivo: str = Field(max_length=64, index=True)
    tamaño_bytes: int
    tipo_archivo: str = Field(max_length=50) # 'pdf', 'csv', 'xlsx'
    ruta_almacenamiento: str = Field(max_length=500)
    
    mes_fact: int
    año_fact: int
    categoria: str = Field(max_length=100)
    subcategoria: str = Field(max_length=100)
    
    estado: str = Field(default="Cargado", max_length=50) # 'Cargado', 'Procesando', 'Procesado', 'Error'
    error_log: Optional[str] = Field(default=None)
    
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)
    
    registros_crudos: List["NominaRegistroCrudo"] = Relationship(back_populates="archivo", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    registros_normalizados: List["NominaRegistroNormalizado"] = Relationship(back_populates="archivo", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class NominaRegistroCrudo(SQLModel, table=True):
    """Registros extraídos tal cual del archivo (JSON)"""
    __tablename__ = "nomina_registros_crudos"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    archivo_id: int = Field(foreign_key="nomina_archivos.id")
    fila_origen: int
    payload: Any = Field(sa_column=Column(JSON))
    
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    
    archivo: NominaArchivo = Relationship(back_populates="registros_crudos")


class NominaRegistroNormalizado(SQLModel, table=True):
    """Registros normalizados con el formato de 8 columnas estándar"""
    __tablename__ = "nomina_registros_normalizados"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    archivo_id: int = Field(foreign_key="nomina_archivos.id")
    
    fecha_creacion: datetime = Field(default_factory=datetime.now)
    mes_fact: int
    año_fact: int
    cedula: str = Field(max_length=50, index=True)
    nombre_asociado: Optional[str] = Field(default=None, max_length=255)
    valor: float
    empresa: str = Field(max_length=255)
    concepto: str = Field(max_length=255)
    
    categoria_final: str = Field(max_length=100)
    subcategoria_final: str = Field(max_length=100)
    estado_validacion: str = Field(default="PENDIENTE", max_length=50) # 'OK', 'NO_COINCIDE', 'NO_CLASIFICADO'
    
    fila_origen: int
    
    archivo: NominaArchivo = Relationship(back_populates="registros_normalizados")


class NominaConcepto(SQLModel, table=True):
    """Reglas de clasificación para conceptos de nómina"""
    __tablename__ = "nomina_conceptos"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    empresa: str = Field(max_length=255)
    concepto: str = Field(max_length=255)
    
    categoria: str = Field(max_length=100)
    subcategoria: str = Field(max_length=100)
    
    prioridad: int = Field(default=1)
    es_regex: bool = Field(default=False)
    keywords: Optional[str] = Field(default=None, max_length=500) # Para búsquedas tipo "contiene"
    
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


# --- Schemas ---

class NominaUploadResponse(SQLModel):
    id: int
    nombre_archivo: str
    estado: str

class NominaResumenSubcat(SQLModel):
    subcategoria: str
    total_registros: int
    total_valor: float

class NominaExportSolid(SQLModel):
    subcategoria: str
    registros: List[NominaRegistroNormalizado]
    no_clasificado: List[NominaRegistroNormalizado]
