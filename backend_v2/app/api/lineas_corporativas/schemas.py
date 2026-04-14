from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

# --- EQUIPOS ---
class EquipoMovilBase(BaseModel):
    marca: Optional[str] = None
    modelo: str
    imei: Optional[str] = None
    serial: Optional[str] = None
    estado_fisico: str = "BUENO"
    observaciones: Optional[str] = None

class EquipoMovilCreate(EquipoMovilBase):
    pass

class EquipoMovilOut(EquipoMovilBase):
    id: int
    class Config:
        from_attributes = True

# --- PERSONAS / EMPLEADOS ---
class EmpleadoLineaBase(BaseModel):
    documento: str
    nombre: str
    tipo: str = "INTERNO"
    cargo: Optional[str] = None
    area: Optional[str] = None
    centro_costo: Optional[str] = None

class EmpleadoLineaCreate(EmpleadoLineaBase):
    pass

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
