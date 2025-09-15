"""
Schemas de KPIs y métricas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class DevelopmentKpiMetricBase(BaseModel):
    development_id: str
    metric_type: str = Field(..., max_length=100)
    provider: Optional[str] = Field(None, max_length=100)
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    value: Optional[Decimal] = None
    target_value: Optional[Decimal] = None
    calculated_by: Optional[str] = Field(None, max_length=255)


class DevelopmentKpiMetricCreate(DevelopmentKpiMetricBase):
    pass


class DevelopmentKpiMetric(DevelopmentKpiMetricBase):
    id: int
    calculated_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True
        orm_mode = True


class DevelopmentFunctionalityBase(BaseModel):
    development_id: str
    functionality_name: str = Field(..., max_length=255)
    functionality_code: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    status: str = Field(default="delivered", max_length=50)
    delivery_date: Optional[date] = None
    defects_count: int = 0
    test_coverage_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    complexity_level: str = Field(default="medium", max_length=20)
    estimated_hours: Optional[Decimal] = None
    actual_hours: Optional[Decimal] = None


class DevelopmentFunctionalityCreate(DevelopmentFunctionalityBase):
    pass


class DevelopmentFunctionality(DevelopmentFunctionalityBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        orm_mode = True


class DevelopmentTestResultBase(BaseModel):
    development_id: str
    functionality_id: Optional[int] = None
    test_type: str = Field(..., max_length=50)
    test_phase: Optional[str] = Field(None, max_length=50)
    test_date: Optional[date] = None
    test_status: Optional[str] = Field(None, max_length=50)
    defects_found: int = 0
    defects_severity: Optional[str] = Field(None, max_length=50)
    test_coverage: Optional[Decimal] = Field(None, ge=0, le=100)
    execution_time_hours: Optional[Decimal] = None
    tester_name: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class DevelopmentTestResultCreate(DevelopmentTestResultBase):
    pass


class DevelopmentTestResult(DevelopmentTestResultBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        orm_mode = True


class DevelopmentDeliveryHistoryBase(BaseModel):
    development_id: str
    delivery_version: Optional[str] = Field(None, max_length=50)
    delivery_type: Optional[str] = Field(None, max_length=50)
    delivery_date: Optional[date] = None
    delivery_status: Optional[str] = Field(None, max_length=50)
    return_reason: Optional[str] = None
    return_count: int = 0
    approval_date: Optional[date] = None
    approved_by: Optional[str] = Field(None, max_length=255)
    quality_score: Optional[Decimal] = Field(None, ge=0, le=100)
    defects_reported: int = 0
    defects_resolved: int = 0
    delivery_notes: Optional[str] = None


class DevelopmentDeliveryHistoryCreate(DevelopmentDeliveryHistoryBase):
    pass


class DevelopmentDeliveryHistory(DevelopmentDeliveryHistoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        orm_mode = True


class DevelopmentQualityMetricBase(BaseModel):
    development_id: str
    provider: Optional[str] = Field(None, max_length=100)
    metric_type: str = Field(..., max_length=100)
    metric_name: str = Field(..., max_length=255)
    value: Optional[Decimal] = None
    target_value: Optional[Decimal] = None
    unit: str = Field(default="percentage", max_length=20)
    calculation_method: Optional[str] = Field(None, max_length=100)
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    calculated_by: Optional[str] = Field(None, max_length=255)
    is_current: bool = True


class DevelopmentQualityMetricCreate(DevelopmentQualityMetricBase):
    pass


class DevelopmentQualityMetric(DevelopmentQualityMetricBase):
    id: int
    calculated_at: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        orm_mode = True


class KpiDashboardResponse(BaseModel):
    """Response del dashboard de KPIs"""
    global_compliance: Optional[Decimal] = None
    first_time_quality: Optional[Decimal] = None
    failure_response_time: Optional[Decimal] = None
    defects_per_delivery: Optional[Decimal] = None
    post_production_rework: Optional[Decimal] = None
    total_developments: int = 0
    active_developments: int = 0
    completed_developments: int = 0
    provider_metrics: List[dict] = []


class ProviderKpiSummary(BaseModel):
    """Resumen de KPIs por proveedor"""
    provider_name: str
    global_compliance: Optional[Decimal] = None
    first_time_quality: Optional[Decimal] = None
    failure_response_time_hours: Optional[Decimal] = None
    defects_per_delivery: Optional[Decimal] = None
    post_production_rework_rate: Optional[Decimal] = None
    total_deliveries: int = 0
    on_time_deliveries: int = 0


class KPICalculationRequest(BaseModel):
    """Request para cálculo de KPIs"""
    provider: Optional[str] = Field(None, description="Proveedor específico (opcional)")
    period_start: Optional[date] = Field(None, description="Fecha inicio del período")
    period_end: Optional[date] = Field(None, description="Fecha fin del período")
    metric_types: Optional[List[str]] = Field(None, description="Tipos de métricas a calcular")
    recalculate: bool = Field(False, description="Forzar recálculo de métricas existentes")

    class Config:
        schema_extra = {
            "example": {
                "provider": "Ingesoft",
                "period_start": "2024-01-01",
                "period_end": "2024-03-31",
                "metric_types": ["cumplimiento_fechas", "calidad_primera_entrega"],
                "recalculate": False
            }
        }
