"""
Schemas de KPIs y métricas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class DevelopmentKpiMetricBase(BaseModel):
    desarrollo_id: str
    tipo_metrica: str = Field(..., max_length=100)
    proveedor: Optional[str] = Field(None, max_length=100)
    periodo_inicio: Optional[date] = None
    periodo_fin: Optional[date] = None
    valor: Optional[Decimal] = None
    valor_objetivo: Optional[Decimal] = None
    calculado_por: Optional[str] = Field(None, max_length=255)


class DevelopmentKpiMetricCreate(DevelopmentKpiMetricBase):
    pass


class DevelopmentKpiMetric(DevelopmentKpiMetricBase):
    id: int
    calculado_en: datetime
    creado_en: datetime
    
    class Config:
        orm_mode = True


class DevelopmentFunctionalityBase(BaseModel):
    desarrollo_id: str
    nombre_funcionalidad: str = Field(..., max_length=255)
    codigo_funcionalidad: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = None
    estado: str = Field(default="delivered", max_length=50)
    fecha_entrega: Optional[date] = None
    cantidad_defectos: int = 0
    porcentaje_cobertura_pruebas: Optional[Decimal] = Field(None, ge=0, le=100)
    nivel_complejidad: str = Field(default="medium", max_length=20)
    horas_estimadas: Optional[Decimal] = None
    horas_reales: Optional[Decimal] = None


class DevelopmentFunctionalityCreate(DevelopmentFunctionalityBase):
    pass


class DevelopmentFunctionality(DevelopmentFunctionalityBase):
    id: int
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class DevelopmentTestResultBase(BaseModel):
    desarrollo_id: str
    funcionalidad_id: Optional[int] = None
    tipo_prueba: str = Field(..., max_length=50)
    fase_prueba: Optional[str] = Field(None, max_length=50)
    fecha_prueba: Optional[date] = None
    estado_prueba: Optional[str] = Field(None, max_length=50)
    defectos_encontrados: int = 0
    severidad_defectos: Optional[str] = Field(None, max_length=50)
    cobertura_pruebas: Optional[Decimal] = Field(None, ge=0, le=100)
    horas_ejecucion: Optional[Decimal] = None
    nombre_tester: Optional[str] = Field(None, max_length=255)
    notas: Optional[str] = None


class DevelopmentTestResultCreate(DevelopmentTestResultBase):
    pass


class DevelopmentTestResult(DevelopmentTestResultBase):
    id: int
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class DevelopmentDeliveryHistoryBase(BaseModel):
    desarrollo_id: str
    version_entrega: Optional[str] = Field(None, max_length=50)
    tipo_entrega: Optional[str] = Field(None, max_length=50)
    fecha_entrega: Optional[date] = None
    estado_entrega: Optional[str] = Field(None, max_length=50)
    motivo_devolucion: Optional[str] = None
    cantidad_devoluciones: int = 0
    fecha_aprobacion: Optional[date] = None
    aprobado_por: Optional[str] = Field(None, max_length=255)
    puntaje_calidad: Optional[Decimal] = Field(None, ge=0, le=100)
    defectos_reportados: int = 0
    defectos_resueltos: int = 0
    notas_entrega: Optional[str] = None


class DevelopmentDeliveryHistoryCreate(DevelopmentDeliveryHistoryBase):
    pass


class DevelopmentDeliveryHistory(DevelopmentDeliveryHistoryBase):
    id: int
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class DevelopmentQualityMetricBase(BaseModel):
    desarrollo_id: str
    proveedor: Optional[str] = Field(None, max_length=100)
    tipo_metrica: str = Field(..., max_length=100)
    nombre_metrica: str = Field(..., max_length=255)
    valor: Optional[Decimal] = None
    valor_objetivo: Optional[Decimal] = None
    unidad: str = Field(default="percentage", max_length=20)
    metodo_calculo: Optional[str] = Field(None, max_length=100)
    periodo_inicio: Optional[date] = None
    periodo_fin: Optional[date] = None
    calculado_por: Optional[str] = Field(None, max_length=255)
    es_actual: bool = True


class DevelopmentQualityMetricCreate(DevelopmentQualityMetricBase):
    pass


class DevelopmentQualityMetric(DevelopmentQualityMetricBase):
    id: int
    calculado_en: datetime
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class KpiDashboardResponse(BaseModel):
    """Response del dashboard de KPIs"""
    cumplimiento_global: Optional[Decimal] = None
    calidad_primera_vez: Optional[Decimal] = None
    tiempo_respuesta_fallas: Optional[Decimal] = None
    defectos_por_entrega: Optional[Decimal] = None
    retrabajo_post_produccion: Optional[Decimal] = None
    total_desarrollos: int = 0
    desarrollos_activos: int = 0
    desarrollos_completados: int = 0
    metricas_proveedor: List[dict] = []


class ProviderKpiSummary(BaseModel):
    """Resumen de KPIs por proveedor"""
    nombre_proveedor: str
    cumplimiento_global: Optional[Decimal] = None
    calidad_primera_vez: Optional[Decimal] = None
    horas_tiempo_respuesta_fallas: Optional[Decimal] = None
    defectos_por_entrega: Optional[Decimal] = None
    tasa_retrabajo_post_produccion: Optional[Decimal] = None
    total_entregas: int = 0
    entregas_a_tiempo: int = 0


class KPICalculationRequest(BaseModel):
    """Request para cálculo de KPIs"""
    proveedor: Optional[str] = Field(None, description="Proveedor específico (opcional)")
    periodo_inicio: Optional[date] = Field(None, description="Fecha inicio del período")
    periodo_fin: Optional[date] = Field(None, description="Fecha fin del período")
    tipos_metrica: Optional[List[str]] = Field(None, description="Tipos de métricas a calcular")
    recalcular: bool = Field(False, description="Forzar recálculo de métricas existentes")

    class Config:
        schema_extra = {
            "example": {
                "proveedor": "Ingesoft",
                "periodo_inicio": "2024-01-01",
                "periodo_fin": "2024-03-31",
                "tipos_metrica": ["cumplimiento_fechas", "calidad_primera_entrega"],
                "recalcular": False
            }
        }
