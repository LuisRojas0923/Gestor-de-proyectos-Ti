"""
Modelos SOLID - Registro y Versionamiento
"""
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Text

class ModuloSolid(SQLModel, table=True):
    """Módulos principales del ecosistema SOLID (ej. Viáticos)"""
    __tablename__ = "solid_modulos"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = Field(sa_column=Column(Text))
    version_actual: str = Field(default="1.0.0", max_length=20)
    
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    actualizado_en: datetime = Field(default_factory=datetime.utcnow)
    
    # Relaciones
    componentes: List["ComponenteSolid"] = Relationship(back_populates="modulo")

class ComponenteSolid(SQLModel, table=True):
    """Componentes dentro de un módulo (ej. Reporte de Gastos)"""
    __tablename__ = "solid_componentes"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    modulo_id: int = Field(foreign_key="solid_modulos.id")
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = Field(sa_column=Column(Text))
    version: str = Field(default="1.0.0", max_length=20)
    
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    
    # Relaciones
    modulo: Optional[ModuloSolid] = Relationship(back_populates="componentes")
    opciones: List["OpcionSolid"] = Relationship(back_populates="componente")

class OpcionSolid(SQLModel, table=True):
    """Opciones o configuraciones específicas de un componente"""
    __tablename__ = "solid_opciones"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    componente_id: int = Field(foreign_key="solid_componentes.id")
    nombre: str = Field(max_length=100)
    valor: str = Field(max_length=255)
    descripcion: Optional[str] = Field(sa_column=Column(Text))
    
    # Relaciones
    componente: Optional[ComponenteSolid] = Relationship(back_populates="opciones")
