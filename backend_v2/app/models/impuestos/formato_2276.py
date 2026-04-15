from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, text

class Formato2276(SQLModel, table=True):
    """Modelo para almacenar la información del Formato 2276 (Información Exógena)"""
    __tablename__ = "formato_2276"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Metadatos de la carga
    ano_gravable: int = Field(index=True)
    fecha_carga: datetime = Field(sa_column_kwargs={"server_default": text("now()")})
    cargado_por: str = Field(max_length=50) # ID del usuario que subió el archivo

    # Información del beneficiario
    tdocb: str = Field(max_length=5)   # Tipo de documento
    nitb: str = Field(index=True, max_length=20) # Número de identificación
    pap: str = Field(max_length=100)  # Primer Apellido
    sap: Optional[str] = Field(default=None, max_length=100) # Segundo Apellido
    pno: str = Field(max_length=100)  # Primer Nombre
    ono: Optional[str] = Field(default=None, max_length=100) # Otros Nombres
    dir: Optional[str] = Field(default=None, max_length=255) # Dirección
    dpto: Optional[str] = Field(default=None, max_length=5)   # Departamento
    mun: Optional[str] = Field(default=None, max_length=5)    # Municipio
    pais: Optional[str] = Field(default=None, max_length=5)   # País

    # Ingresos
    pasa: float = Field(default=0.0) # Salarios
    paec: float = Field(default=0.0) # Emolumentos eclesiásticos
    pabop: float = Field(default=0.0) # Bonos/Tarjetas/Vales
    vaex: float = Field(default=0.0) # Exceso alimentación > 41 UVT
    paho: float = Field(default=0.0) # Honorarios
    pase: float = Field(default=0.0) # Servicios
    paco: float = Field(default=0.0) # Comisiones
    papre: float = Field(default=0.0) # Prestaciones sociales
    pavia: float = Field(default=0.0) # Viáticos
    paga: float = Field(default=0.0) # Gastos de representación
    patra: float = Field(default=0.0) # Trabajo asociado cooperativo
    vapo: float = Field(default=0.0) # Apoyos económicos educativos
    potro: float = Field(default=0.0) # Otros pagos
    cein: float = Field(default=0.0) # Cesantías e Intereses pagadas
    ceco: float = Field(default=0.0) # Cesantías consignadas fondo
    auce: float = Field(default=0.0) # Cesantías régimen tradicional
    peju: float = Field(default=0.0) # Pensiones
    tingbtp: float = Field(default=0.0) # Total ingresos brutos

    # Aportes y Retenciones
    apos: float = Field(default=0.0) # Salud
    apof: float = Field(default=0.0) # Pensión/Solidaridad
    aprais: float = Field(default=0.0) # Voluntarios RAIS
    apov: float = Field(default=0.0) # Pensiones voluntarias
    apafc: float = Field(default=0.0) # Cuentas AFC
    apavc: float = Field(default=0.0) # Cuentas AVC
    vare: float = Field(default=0.0) # Retenciones en la fuente
    ivav: float = Field(default=0.0) # IVA mayor valor costo
    rfiva: float = Field(default=0.0) # Retención IVA
    pagahuvt: float = Field(default=0.0) # Alimentación hasta 41 UVT
    vilap: float = Field(default=0.0) # Ingreso laboral promedio últimos 6 meses

    # Otros Datos
    tdocde: Optional[str] = Field(default=None, max_length=5) # TDOC dependiente
    nitde: Optional[str] = Field(default=None, max_length=20) # Identificación dependiente
    identfc: Optional[str] = Field(default=None, max_length=50) # Fideicomiso
    tdocpcc: Optional[str] = Field(default=None, max_length=5) # TDOC participante contrato
    nitpcc: Optional[str] = Field(default=None, max_length=20) # Identificación participante contrato
