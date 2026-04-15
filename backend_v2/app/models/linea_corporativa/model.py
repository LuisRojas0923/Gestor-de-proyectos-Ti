from typing import Optional, List
from datetime import date, datetime
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy import Numeric, Text

class EquipoMovil(SQLModel, table=True):
    __tablename__ = "equipos_moviles"

    id: Optional[int] = Field(default=None, primary_key=True)
    marca: Optional[str] = Field(default=None, index=True)
    modelo: str = Field(index=True)
    imei: Optional[str] = Field(default=None, unique=True, index=True)
    serial: Optional[str] = Field(default=None)
    estado_fisico: str = Field(default="BUENO")
    observaciones: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    lineas: List["LineaCorporativa"] = Relationship(back_populates="equipo")

class EmpleadoLinea(SQLModel, table=True):
    __tablename__ = "empleados_lineas"

    documento: str = Field(primary_key=True, description="Cédula, NIT o ID Alfanumérico")
    nombre: str = Field(index=True)
    tipo: str = Field(default="INTERNO", description="INTERNO / EXTERNO / BENEFICIARIO")
    cargo: Optional[str] = Field(default=None)
    area: Optional[str] = Field(default=None, index=True)
    centro_costo: Optional[str] = Field(default=None)
    
    # Relaciones
    lineas_asignadas: List["LineaCorporativa"] = Relationship(
        back_populates="asignado", 
        sa_relationship_kwargs={"foreign_keys": "LineaCorporativa.documento_asignado"}
    )
    lineas_responsable: List["LineaCorporativa"] = Relationship(
        back_populates="responsable_cobro",
        sa_relationship_kwargs={"foreign_keys": "LineaCorporativa.documento_cobro"}
    )

class LineaCorporativa(SQLModel, table=True):
    __tablename__ = "lineas_corporativas"

    id: Optional[int] = Field(default=None, primary_key=True)
    fecha_actualizacion: Optional[date] = Field(default=None)
    linea: str = Field(index=True, unique=True, description="Número o SIN SIM")
    empresa: str = Field(index=True)
    estatus: str = Field(default="ACTIVA")
    estado_asignacion: str = Field(default="ASIGNADA")
    
    # Llaves Foráneas
    equipo_id: Optional[int] = Field(default=None, foreign_key="equipos_moviles.id")
    documento_asignado: Optional[str] = Field(default=None, foreign_key="empleados_lineas.documento")
    documento_cobro: Optional[str] = Field(default=None, foreign_key="empleados_lineas.documento")
    
    # Atributos de Plan y Parámetros de Dispersión
    nombre_plan: Optional[str] = Field(default=None)
    convenio: Optional[str] = Field(default=None)
    aprobado_por: Optional[str] = Field(default=None)
    observaciones: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # Coeficientes para el motor de dispersión (0, 0.5, 1)
    cobro_fijo_coef: float = Field(default=0.5, description="Factor de cobro al empleado para Cargo Fijo")
    cobro_especiales_coef: float = Field(default=1.0, description="Factor de cobro al empleado para Servicios Especiales/Roaming")

    # Histórico de Totales (Snapshot del último mes)
    cfm_con_iva: Optional[float] = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    cfm_sin_iva: Optional[float] = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    descuento_39: Optional[float] = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    vr_factura: Optional[float] = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    pago_empleado: Optional[float] = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    pago_empresa: Optional[float] = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    primera_quincena: Optional[float] = Field(default=0.0, sa_column=Column(Numeric(12, 2)))
    segunda_quincena: Optional[float] = Field(default=0.0, sa_column=Column(Numeric(12, 2)))

    # Objetos Relacionados
    equipo: Optional[EquipoMovil] = Relationship(back_populates="lineas")
    asignado: Optional[EmpleadoLinea] = Relationship(
        back_populates="lineas_asignadas",
        sa_relationship_kwargs={"foreign_keys": "LineaCorporativa.documento_asignado"}
    )
    responsable_cobro: Optional[EmpleadoLinea] = Relationship(
        back_populates="lineas_responsable",
        sa_relationship_kwargs={"foreign_keys": "LineaCorporativa.documento_cobro"}
    )

    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
