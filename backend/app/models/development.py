"""
Modelos de desarrollos, fases y etapas
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, DECIMAL, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DevelopmentPhase(Base):
    __tablename__ = "fases_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre_fase = Column(String(100), nullable=False)  # 'En Ejecución', 'En Espera', 'Finales / Otros'
    descripcion_fase = Column(Text)
    color_fase = Column(String(20))  # 'info', 'warning', 'success'
    esta_activo = Column(Boolean, default=True)
    orden_ordenamiento = Column(Integer)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    etapas = relationship("DevelopmentStage", back_populates="fase", cascade="all, delete-orphan")
    desarrollos = relationship("Development", back_populates="fase_actual")


class DevelopmentStage(Base):
    __tablename__ = "etapas_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    fase_id = Column(Integer, ForeignKey("fases_desarrollo.id"), nullable=False)
    codigo_etapa = Column(String(20), nullable=False)  # '0', '1', '2', '3', etc.
    nombre_etapa = Column(String(255), nullable=False)  # Nombre amigable de la etapa
    descripcion_etapa = Column(Text)
    es_hito = Column(Boolean, default=False)
    dias_estimados = Column(Integer)
    parte_responsable = Column(String(100))  # 'proveedor', 'usuario', 'equipo_interno'
    orden_ordenamiento = Column(Integer)
    esta_activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    fase = relationship("DevelopmentPhase", back_populates="etapas")
    desarrollos = relationship("Development", back_populates="etapa_actual")


class Development(Base):
    __tablename__ = "desarrollos"
    
    id = Column(String(50), primary_key=True)  # No. de Solicitud (Portal)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text)
    modulo = Column(String(100))
    tipo = Column(String(50))  # 'Desarrollo', 'Consulta'
    ambiente = Column(String(100))
    enlace_portal = Column(Text)
    
    # CAMPOS PARA CICLO DE DESARROLLO
    fase_actual_id = Column(Integer, ForeignKey("fases_desarrollo.id"))
    etapa_actual_id = Column(Integer, ForeignKey("etapas_desarrollo.id"))
    porcentaje_progreso_etapa = Column(DECIMAL(5, 2), default=0.0)
    
    # CAMPOS LEGACY PARA COMPATIBILIDAD CON CRUD.PY
    estado_general = Column(String(50), default="Pendiente")  # 'Pendiente', 'En curso', 'Completado'
    fecha_estimada_fin = Column(Date)  # Fecha estimada de finalización
    proveedor = Column(String(100))  # Proveedor principal
    responsable = Column(String(255))  # Responsable principal del desarrollo
    
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    fase_actual = relationship("DevelopmentPhase", back_populates="desarrollos")
    etapa_actual = relationship("DevelopmentStage", back_populates="desarrollos")
    fechas = relationship("DevelopmentDate", back_populates="desarrollo", cascade="all, delete-orphan")
    propuestas = relationship("DevelopmentProposal", back_populates="desarrollo", cascade="all, delete-orphan")
    # instaladores = relationship("DevelopmentInstaller", back_populates="desarrollo", cascade="all, delete-orphan")  # ELIMINADO
    proveedores = relationship("DevelopmentProvider", back_populates="desarrollo", cascade="all, delete-orphan")
    responsables = relationship("DevelopmentResponsible", back_populates="desarrollo", cascade="all, delete-orphan")
    historial_estados = relationship("DevelopmentStatusHistory", back_populates="desarrollo", cascade="all, delete-orphan")
    observaciones = relationship("DevelopmentObservation", back_populates="desarrollo", cascade="all, delete-orphan")
    actividades_proximas = relationship("DevelopmentUpcomingActivity", back_populates="desarrollo", cascade="all, delete-orphan")
    metricas_kpi = relationship("DevelopmentKpiMetric", back_populates="desarrollo", cascade="all, delete-orphan")
    controles_calidad = relationship("DevelopmentQualityControl", back_populates="desarrollo", cascade="all, delete-orphan")
    funcionalidades = relationship("DevelopmentFunctionality", back_populates="desarrollo", cascade="all, delete-orphan")
    metricas_calidad = relationship("DevelopmentQualityMetric", back_populates="desarrollo", cascade="all, delete-orphan")
    resultados_pruebas = relationship("DevelopmentTestResult", back_populates="desarrollo", cascade="all, delete-orphan")
    historial_entregas = relationship("DevelopmentDeliveryHistory", back_populates="desarrollo", cascade="all, delete-orphan")
    logs_actividad = relationship("ActivityLog", back_populates="desarrollo", cascade="all, delete-orphan")
    incidentes = relationship("Incident", back_populates="desarrollo", cascade="all, delete-orphan")
    
    # Relaciones MCP (IA)
    cache_contexto_ia = relationship("AiContextCache", back_populates="desarrollo", cascade="all, delete-orphan")
    historial_analisis_ia = relationship("AiAnalysisHistory", back_populates="desarrollo", cascade="all, delete-orphan")
    recomendaciones_ia = relationship("AiRecommendation", back_populates="desarrollo", cascade="all, delete-orphan")


class DevelopmentDate(Base):
    __tablename__ = "fechas_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    tipo_fecha = Column(String(50), nullable=False)  # 'inicio', 'fin_estimado', 'entrega', 'cierre', 'produccion'
    fecha_planificada = Column(Date)
    fecha_real = Column(Date)
    dias_estimados = Column(Integer)
    dias_reales = Column(Integer)
    
    # CAMPOS PARA INDICADORES DE CALIDAD
    estado_entrega = Column(String(50))  # 'on_time', 'delayed', 'cancelled'
    estado_aprobacion = Column(String(50))  # 'approved_first_time', 'approved_with_returns', 'rejected'
    cantidad_funcionalidades = Column(Integer, default=0)
    fecha_despliegue_produccion = Column(Date)
    puntaje_cumplimiento_entrega = Column(DECIMAL(5, 2))
    
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="fechas")


class DevelopmentProposal(Base):
    __tablename__ = "propuestas_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    numero_propuesta = Column(String(100), nullable=False)
    costo = Column(DECIMAL(15, 2))
    estado = Column(String(50))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="propuestas")


class DevelopmentProvider(Base):
    __tablename__ = "proveedores_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    nombre_proveedor = Column(String(100), nullable=False)  # 'Ingesoft', 'ITC', 'TI'
    punto_servicio_side = Column(String(100))  # SIDE/Service Point
    sistema_proveedor = Column(String(100))  # Sistema del proveedor
    estado = Column(String(50))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="proveedores")


class DevelopmentResponsible(Base):
    __tablename__ = "responsables_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    nombre_usuario = Column(String(255), nullable=False)
    tipo_rol = Column(String(50), nullable=False)  # 'solicitante', 'tecnico', 'area'
    area = Column(String(100))
    es_principal = Column(Boolean, default=False)
    fecha_asignacion = Column(Date)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="responsables")


class DevelopmentStatusHistory(Base):
    __tablename__ = "historial_estados_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    estado = Column(String(50), nullable=False)
    etapa_progreso = Column(String(100))
    fecha_cambio = Column(DateTime(timezone=True), server_default=func.now())
    cambiado_por = Column(String(255))
    estado_anterior = Column(String(50))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="historial_estados")


class DevelopmentObservation(Base):
    __tablename__ = "observaciones_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    tipo_observacion = Column(String(50), nullable=False)  # 'estado', 'seguimiento', 'problema', 'acuerdo'
    contenido = Column(Text, nullable=False)
    autor = Column(String(255))
    fecha_observacion = Column(DateTime(timezone=True), server_default=func.now())
    es_actual = Column(Boolean, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development", back_populates="observaciones")


class DevelopmentActivityLog(Base):
    __tablename__ = "log_actividades_desarrollo"
    
    id = Column(Integer, primary_key=True, index=True)
    desarrollo_id = Column(String(50), ForeignKey("desarrollos.id"), nullable=False)
    etapa_id = Column(Integer, ForeignKey("etapas_desarrollo.id"), nullable=False)
    tipo_actividad = Column(String(100), nullable=False)  # 'nueva_actividad', 'seguimiento', 'cierre_etapa'
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date)
    proximo_seguimiento_en = Column(Date)
    estado = Column(String(50), default="pendiente")  # 'pendiente', 'en_curso', 'completada', 'cancelada'
    tipo_actor = Column(String(50), nullable=False)  # 'equipo_interno', 'proveedor', 'usuario'
    notas = Column(Text)
    payload_dinamico = Column(JSON)  # Campos específicos por etapa
    creado_por = Column(String(255))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    desarrollo = relationship("Development")
    etapa = relationship("DevelopmentStage")
