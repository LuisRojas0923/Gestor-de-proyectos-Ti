from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
from datetime import date, datetime

# --- EQUIPOS ---
class EquipoMovilBase(BaseModel):
    marca: Optional[str] = Field(default=None, max_length=100)
    modelo: str = Field(min_length=1, max_length=150)
    imei: Optional[str] = Field(default=None, max_length=50)
    serial: Optional[str] = Field(default=None, max_length=100)
    estado_fisico: Literal["NUEVO", "BUENO", "REGULAR", "MALO", "DAÑADO"] = "BUENO"
    observaciones: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("imei", "serial", mode="before")
    @classmethod
    def nullify_empty_string(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        return v.strip() if isinstance(v, str) else v

    @field_validator("modelo", mode="before")
    @classmethod
    def validar_modelo(cls, value):
        if value is None or not str(value).strip():
            raise ValueError("El modelo es obligatorio")
        return str(value).strip()

class EquipoMovilCreate(EquipoMovilBase):
    pass

class EquipoMovilUpdate(BaseModel):
    marca: Optional[str] = Field(default=None, max_length=100)
    modelo: Optional[str] = Field(default=None, max_length=150)
    imei: Optional[str] = Field(default=None, max_length=50)
    serial: Optional[str] = Field(default=None, max_length=100)
    estado_fisico: Optional[Literal["NUEVO", "BUENO", "REGULAR", "MALO", "DAÑADO"]] = None
    observaciones: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("imei", "serial", mode="before")
    @classmethod
    def normalizar_identificador(cls, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return value.strip() if isinstance(value, str) else value

    @field_validator("modelo", mode="before")
    @classmethod
    def validar_modelo_actualizado(cls, value):
        if value is None or not str(value).strip():
            raise ValueError("El modelo no puede quedar vacío")
        return str(value).strip()

class EquipoMovilOut(EquipoMovilBase):
    id: int
    class Config:
        from_attributes = True

# --- PERSONAS / EMPLEADOS ---
class EmpleadoLineaBase(BaseModel):
    documento: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    nombre: str = Field(min_length=1, max_length=200)
    tipo: Literal["INTERNO", "EXTERNO", "PROVEEDOR", "BENEFICIARIO"] = "INTERNO"
    cargo: Optional[str] = Field(default=None, max_length=150)
    area: Optional[str] = Field(default=None, max_length=150)
    centro_costo: Optional[str] = Field(default=None, max_length=100)

    @field_validator("documento", "nombre", mode="before")
    @classmethod
    def normalizar_requerido(cls, value):
        if value is None or not str(value).strip():
            raise ValueError("El campo es obligatorio")
        return str(value).strip()

class EmpleadoLineaCreate(EmpleadoLineaBase):
    pass

class EmpleadoLineaUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, max_length=200)
    tipo: Optional[Literal["INTERNO", "EXTERNO", "PROVEEDOR", "BENEFICIARIO"]] = None
    cargo: Optional[str] = Field(default=None, max_length=150)
    area: Optional[str] = Field(default=None, max_length=150)
    centro_costo: Optional[str] = Field(default=None, max_length=100)

    @field_validator("nombre", mode="before")
    @classmethod
    def validar_nombre_actualizado(cls, value):
        if value is None or not str(value).strip():
            raise ValueError("El nombre no puede quedar vacío")
        return str(value).strip()

class EmpleadoLineaOut(EmpleadoLineaBase):
    class Config:
        from_attributes = True

# --- LINEAS ---
class LineaCorporativaBase(BaseModel):
    fecha_actualizacion: Optional[date] = None
    linea: str
    empresa: str
    estatus: str = "ACTIVA"
    estado_asignacion: str = "ASIGNADA"
    
    equipo_id: Optional[int] = None
    documento_asignado: Optional[str] = None
    documento_cobro: Optional[str] = None
    
    nombre_plan: Optional[str] = None
    convenio: Optional[str] = None
    aprobado_por: Optional[str] = None
    observaciones: Optional[str] = None
    
    # Coeficientes
    cobro_fijo_coef: float = 0.5
    cobro_especiales_coef: float = 1.0
    
    # Snapshot actual
    cfm_con_iva: Optional[float] = 0.0
    cfm_sin_iva: Optional[float] = 0.0
    descuento_39: Optional[float] = 0.0
    vr_factura: Optional[float] = 0.0
    pago_empleado: Optional[float] = 0.0
    pago_empresa: Optional[float] = 0.0
    primera_quincena: Optional[float] = 0.0
    segunda_quincena: Optional[float] = 0.0

class LineaCorporativaCreate(LineaCorporativaBase):
    pass

class LineaCorporativaUpdate(BaseModel):
    fecha_actualizacion: Optional[date] = None
    linea: Optional[str] = None
    empresa: Optional[str] = None
    estatus: Optional[str] = None
    estado_asignacion: Optional[str] = None
    equipo_id: Optional[int] = None
    documento_asignado: Optional[str] = None
    documento_cobro: Optional[str] = None
    nombre_plan: Optional[str] = None
    convenio: Optional[str] = None
    aprobado_por: Optional[str] = None
    observaciones: Optional[str] = None
    cobro_fijo_coef: Optional[float] = None
    cobro_especiales_coef: Optional[float] = None
    cfm_con_iva: Optional[float] = None
    cfm_sin_iva: Optional[float] = None
    descuento_39: Optional[float] = None
    vr_factura: Optional[float] = None
    pago_empleado: Optional[float] = None
    pago_empresa: Optional[float] = None
    primera_quincena: Optional[float] = None
    segunda_quincena: Optional[float] = None

class LineaCorporativaOut(LineaCorporativaBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    equipo: Optional[EquipoMovilOut] = None
    asignado: Optional[EmpleadoLineaOut] = None
    responsable_cobro: Optional[EmpleadoLineaOut] = None

    class Config:
        from_attributes = True

# --- FACTURACIÓN Y REPORTES ---
class FacturaLineaBase(BaseModel):
    linea_id: int
    periodo: str
    documento_asignado: str
    centro_costo: str
    cargo_mes: float
    descuento_mes: float
    impoconsumo: float
    descuento_iva: float
    iva_19: float
    total: float
    pago_empleado: float
    pago_refridcol: float

class FacturaLineaOut(FacturaLineaBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ResumenCORow(BaseModel):
    co: str
    cargo_mes: float
    descuento_mes: float
    impoconsumo: float
    descuento_iva: float
    iva_19: float
    total: float

class FacturaDetalleRow(BaseModel):
    id: int
    min: str
    nombre: str
    descripcion: str
    valor: float
    iva: float
    ciclo: str
    criterio: str

    class Config:
        from_attributes = True
