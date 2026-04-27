"""
Modelos de Nómina - Backend V2 (SQLModel)
"""
from typing import Optional, List, Any
from datetime import datetime, date
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
    
    # Nuevos campos para planillas y otros
    horas: float = Field(default=0)
    dias: float = Field(default=0)
    
    fila_origen: int
    observaciones: Optional[str] = Field(default=None)
    
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


class NominaFavorito(SQLModel, table=True):
    """Favoritos de nómina para autocompletar formularios manuales"""
    __tablename__ = "nomina_favoritos"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id")
    cedula: str = Field(max_length=50, index=True)
    subcategoria: str = Field(max_length=100)
    
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


# --- Control de Descuentos ---

class ControlDescuentoActivo(SQLModel, table=True):
    __tablename__ = "control_descuentos_activos"
    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(index=True, max_length=50)
    nombre: str = Field(max_length=255)
    empresa: str = Field(max_length=255)
    cargo: Optional[str] = Field(default=None, max_length=255)
    area: Optional[str] = Field(default=None, max_length=255)
    concepto: str = Field(max_length=255)
    valor_descuento: float
    n_cuotas: int
    valor_cuota: float
    concepto_nomina: str = Field(default="111", max_length=20)
    fecha_inicio: date
    fecha_finalizacion: date
    observaciones: Optional[str] = Field(default=None)
    creado_en: datetime = Field(default_factory=datetime.now)


class ControlDescuentoConcepto(SQLModel, table=True):
    __tablename__ = "control_descuentos_conceptos"
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=255, unique=True)
    concepto_nomina: str = Field(default="111", max_length=20)
    activo: bool = Field(default=True)


# --- Excepciones de Nómina ---

class NominaExcepcion(SQLModel, table=True):
    """Configuración de excepciones de nómina (pagos a terceros, saldos a favor, etc)"""
    __tablename__ = "nomina_excepciones"

    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(index=True, max_length=50)
    nombre_asociado: Optional[str] = Field(default=None, max_length=255)
    subcategoria: str = Field(max_length=100)
    tipo: str = Field(max_length=50)  # 'SALDO_FAVOR', 'PAGO_TERCERO', 'RETIRADO_AUTORIZADO', etc.
    estado: str = Field(default="ACTIVO", max_length=20)  # 'ACTIVO', 'INACTIVO', 'AGOTADO'
    
    valor_configurado: float = Field(default=0)
    saldo_actual: float = Field(default=0)
    pagador_cedula: Optional[str] = Field(default=None, max_length=50)
    
    fecha_inicio: datetime = Field(default_factory=datetime.now)
    fecha_fin: Optional[datetime] = Field(default=None)
    observacion: Optional[str] = Field(default=None)
    
    creado_por: str = Field(max_length=100)
    creado_en: datetime = Field(default_factory=datetime.now)
    actualizado_en: Optional[datetime] = Field(default=None)

    @staticmethod
    def parse_dates(date_val):
        if not date_val:
            return None
        if isinstance(date_val, datetime):
            return date_val
        try:
            # Convertir a datetime y forzar a ser naive (quitar +00:00 / Z) para evitar conflictos con PG TIMESTAMP
            dt = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
            return dt.replace(tzinfo=None)
        except:
            dt_str = date_val.split('T')[0]
            dt = datetime.strptime(dt_str, '%Y-%m-%d')
            return dt.replace(tzinfo=None)


class NominaExcepcionHistorial(SQLModel, table=True):
    """Histórico de aplicaciones de una excepción"""
    __tablename__ = "nomina_excepciones_historial"

    id: Optional[int] = Field(default=None, primary_key=True)
    excepcion_id: int = Field(foreign_key="nomina_excepciones.id")
    
    mes: int
    anio: int
    valor_applied: float = Field(default=0, sa_column_kwargs={"name": "valor_aplicado"})
    mensaje: str
    creado_en: datetime = Field(default_factory=datetime.now)


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
