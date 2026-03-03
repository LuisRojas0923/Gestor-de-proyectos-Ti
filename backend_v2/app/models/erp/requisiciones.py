from typing import Optional, List
from datetime import date, time
from sqlmodel import SQLModel, Field, Relationship

# ==========================================
# Modelos de Base de Datos ERP (table=True)
# ==========================================


class SolicitudMaterial(SQLModel, table=True):
    """Encabezado de la solicitud de materiales en el ERP"""

    __tablename__ = "solicitudmaterial"

    codigo: Optional[int] = Field(default=None, primary_key=True)  # bigint serial
    codigosolicitud: str = Field(max_length=50)  # Ej: MAT-S1000
    fecha: date
    hora: time
    ordentrabajo: Optional[str] = Field(default=None, max_length=100)
    cliente: Optional[str] = Field(default=None, max_length=150)
    uen: Optional[str] = Field(default=None, max_length=100)
    fechanecesidad: date
    estado: Optional[str] = Field(default="SOLICITADO", max_length=50)
    usuario: Optional[int] = Field(default=None)  # Id numérico de usuario en ERP
    nombreusuario: Optional[str] = Field(default=None, max_length=150)
    observaciones: Optional[str] = Field(default=None)
    anexo: Optional[int] = Field(default=None)

    # Relación uno-a-muchos con las líneas
    lineas: List["LineaSolicitudMaterial"] = Relationship(
        back_populates="solicitud",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class LineaSolicitudMaterial(SQLModel, table=True):
    """Detalle/Línea de la solicitud de materiales en el ERP"""

    __tablename__ = "lineasolicitudmaterial"

    codigo: Optional[int] = Field(default=None, primary_key=True)  # bigint serial
    solicitudmaterial: Optional[int] = Field(
        default=None, foreign_key="solicitudmaterial.codigo"
    )
    fecha: date
    especialidad: Optional[str] = Field(default=None, max_length=150)
    subindice: Optional[str] = Field(default=None, max_length=150)
    centrocosto: Optional[str] = Field(default=None, max_length=100)
    subcentrocosto: Optional[str] = Field(default=None, max_length=100)
    tipodestino: Optional[str] = Field(default=None, max_length=100)
    tipoproducto: Optional[str] = Field(default=None, max_length=100)
    materialde: Optional[str] = Field(default=None, max_length=100)
    referenciaproducto: Optional[str] = Field(default=None, max_length=100)
    descripcionproducto: Optional[str] = Field(default=None, max_length=255)
    cantidad: float = Field(default=0.0)  # double precision
    unidadmedida: Optional[str] = Field(default=None, max_length=50)
    tipo: Optional[str] = Field(default=None, max_length=100)
    clasificacion: Optional[str] = Field(default=None, max_length=100)
    rotacion: Optional[str] = Field(default=None, max_length=50)
    proveedorfrecuente: Optional[str] = Field(default=None, max_length=150)
    observaciones: Optional[str] = Field(default=None)

    # Relación con el encabezado
    solicitud: Optional[SolicitudMaterial] = Relationship(back_populates="lineas")


# ==========================================
# Vistas/Modelos de sólo lectura (table=False)
# ==========================================


class OTSistemaSolicitudes(SQLModel, table=False):
    """Schema para leer desde la vista/tabla otsistemasolicitudes"""

    orden: Optional[str] = None
    cliente: Optional[str] = None
    uen: Optional[str] = None
    especialidad: Optional[str] = None
    subindice: Optional[str] = None
    centro_costo: Optional[str] = None
    subcentro: Optional[str] = None
    categoria_sub_indice: Optional[str] = None


class CatalogoProducto(SQLModel, table=False):
    """Schema para leer desde la vista/tabla catalogoproducto"""

    referencia: str
    fecha: Optional[str] = None
    hora: Optional[str] = None
    codigolinea: Optional[str] = None
    codigogrupo: Optional[str] = None
    elemento: Optional[str] = None
    descripcion: Optional[str] = None
    unidadmedida: Optional[str] = None
    linea: Optional[str] = None
    grupo: Optional[str] = None
    tipo: Optional[str] = None
    clasificacion: Optional[str] = None
    rotacion: Optional[str] = None
    periodo: Optional[str] = None
    proveedorfrecuente: Optional[str] = None
    clasificacioncompras: Optional[str] = None
    formato: Optional[str] = None


# ==========================================
# Schemas para Pydantic (Creación)
# ==========================================


class LineaSolicitudMaterialCrear(SQLModel):
    """Schema para recibir una línea al momento de crear la solicitud"""

    especialidad: Optional[str] = None
    subindice: Optional[str] = None
    centrocosto: Optional[str] = None
    subcentrocosto: Optional[str] = None
    tipodestino: Optional[str] = None
    tipoproducto: Optional[str] = None
    materialde: Optional[str] = None
    referenciaproducto: Optional[str] = None
    descripcionproducto: Optional[str] = None
    cantidad: float
    unidadmedida: Optional[str] = None
    tipo: Optional[str] = None
    clasificacion: Optional[str] = None
    rotacion: Optional[str] = None
    proveedorfrecuente: Optional[str] = None
    observaciones: Optional[str] = None


class SolicitudMaterialCrear(SQLModel):
    """Schema para recibir el encabezado completo con sus líneas"""

    prefijo_tipo: str  # Ej: "MAT", "PAN", "GAS" para generar la secuencia (Este no es un campo de tabla)
    ordentrabajo: Optional[str] = None
    cliente: Optional[str] = None
    uen: Optional[str] = None
    fechanecesidad: date
    observaciones: Optional[str] = None

    lineas: List[LineaSolicitudMaterialCrear]
