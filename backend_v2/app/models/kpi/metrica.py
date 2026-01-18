"""
Modelos de KPI - Backend V2
"""
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, DECIMAL, Date, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class MetricaKpi(Base):
    """Metricas de KPI por desarrollo"""
    __tablename__ = "metricas_kpi"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    tipo_metrica = Column(String(100), nullable=False)
    proveedor = Column(String(100))
    periodo_inicio = Column(Date)
    periodo_fin = Column(Date)
    valor = Column(DECIMAL(10, 4))
    valor_objetivo = Column(DECIMAL(10, 4))
    calculado_por = Column(String(255))
    calculado_en = Column(DateTime(timezone=True), server_default=func.now())
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class Funcionalidad(Base):
    """Funcionalidades de un desarrollo"""
    __tablename__ = "funcionalidades"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    nombre_funcionalidad = Column(String(255), nullable=False)
    codigo_funcionalidad = Column(String(100))
    descripcion = Column(Text)
    estado = Column(String(50), default="pendiente")
    fecha_entrega = Column(Date)
    cantidad_defectos = Column(Integer, default=0)
    nivel_complejidad = Column(String(20), default="media")
    horas_estimadas = Column(DECIMAL(8, 2))
    horas_reales = Column(DECIMAL(8, 2))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())


class HistorialEntrega(Base):
    """Historial de entregas de un desarrollo"""
    __tablename__ = "historial_entregas"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    version_entrega = Column(String(50))
    tipo_entrega = Column(String(50))
    fecha_entrega = Column(Date)
    estado_entrega = Column(String(50))
    motivo_devolucion = Column(Text)
    cantidad_devoluciones = Column(Integer, default=0)
    fecha_aprobacion = Column(Date)
    aprobado_por = Column(String(255))
    puntaje_calidad = Column(DECIMAL(5, 2))
    defectos_reportados = Column(Integer, default=0)
    defectos_resueltos = Column(Integer, default=0)
    notas_entrega = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
