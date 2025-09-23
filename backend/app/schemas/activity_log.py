"""
Esquemas para el log de actividades de desarrollo
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import date, datetime
from enum import Enum


class ActivityType(str, Enum):
    NUEVA_ACTIVIDAD = "nueva_actividad"
    SEGUIMIENTO = "seguimiento"
    CIERRE_ETAPA = "cierre_etapa"


class ActivityStatus(str, Enum):
    PENDIENTE = "pendiente"
    EN_CURSO = "en_curso"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"


class ActorType(str, Enum):
    EQUIPO_INTERNO = "equipo_interno"
    PROVEEDOR = "proveedor"
    USUARIO = "usuario"


# Campos dinámicos por etapa
class AprobacionPropuestaFields(BaseModel):
    """Campos específicos para etapa de Aprobación de Propuesta"""
    proposal_id: str = Field(..., description="Número/ID de la propuesta")
    proposal_version: Optional[str] = Field(None, description="Versión de la propuesta")
    approver: Optional[str] = Field(None, description="Persona que aprueba")
    approval_date: Optional[date] = Field(None, description="Fecha de aprobación")
    budget_approved: Optional[float] = Field(None, description="Presupuesto aprobado")


class AnalisisFields(BaseModel):
    """Campos específicos para etapa de Análisis"""
    side_case_id: Optional[str] = Field(None, description="Número de caso SIDE")
    servicepoint_case_id: Optional[str] = Field(None, description="Número de caso ServicePoint")
    analyst_assigned: Optional[str] = Field(None, description="Analista asignado")
    scope_analysis: Optional[str] = Field(None, description="Alcance del análisis")
    requirements_count: Optional[int] = Field(None, description="Número de requerimientos")


class InstalacionPruebasFields(BaseModel):
    """Campos específicos para etapa de Instalación en Pruebas"""
    installer_number: str = Field(..., description="Número del instalador")
    environment: Optional[str] = Field(None, description="Ambiente de pruebas")
    change_window: Optional[str] = Field(None, description="Ventana de cambio")
    installation_notes: Optional[str] = Field(None, description="Notas de instalación")
    version: Optional[str] = Field(None, description="Versión del instalador")
    failure_type: Optional[str] = Field(None, description="Tipo de falla si aplica")
    resolution_attempts: Optional[str] = Field(None, description="Intentos de resolución")
    next_actions: Optional[str] = Field(None, description="Próximas acciones")


class ValidacionCorreccionesFields(BaseModel):
    """Campos específicos para etapa de Validación de Correcciones"""
    installer_number: str = Field(..., description="Número del instalador que se está validando")
    failure_description: str = Field(..., description="Descripción detallada de la falla encontrada")
    original_stage_reference: Optional[str] = Field(None, description="Etapa original donde se detectó la falla")
    correction_requirements: Optional[str] = Field(None, description="Requerimientos específicos de corrección")
    validation_notes: Optional[str] = Field(None, description="Notas de la validación realizada")
    provider_response: Optional[str] = Field(None, description="Respuesta del proveedor a las correcciones")
    correction_status: Optional[str] = Field(None, description="Estado de la corrección (pendiente, en_progreso, completada)")
    expected_correction_date: Optional[date] = Field(None, description="Fecha esperada de corrección")
    validation_result: Optional[str] = Field(None, description="Resultado de la validación (aprobada, rechazada, pendiente)")


class DevelopmentActivityLogBase(BaseModel):
    """Esquema base para actividades de desarrollo"""
    stage_id: int = Field(..., description="ID de la etapa")
    activity_type: ActivityType = Field(..., description="Tipo de actividad")
    start_date: date = Field(..., description="Fecha de inicio")
    end_date: Optional[date] = Field(None, description="Fecha de fin")
    next_follow_up_at: Optional[date] = Field(None, description="Próximo seguimiento")
    status: ActivityStatus = Field(ActivityStatus.PENDIENTE, description="Estado de la actividad")
    actor_type: ActorType = Field(..., description="Tipo de actor responsable")
    notes: Optional[str] = Field(None, description="Notas adicionales")
    dynamic_payload: Optional[Dict[str, Any]] = Field(None, description="Campos específicos por etapa")


class DevelopmentActivityLogCreate(DevelopmentActivityLogBase):
    """Esquema para crear una nueva actividad"""
    pass


class DevelopmentActivityLogUpdate(BaseModel):
    """Esquema para actualizar una actividad"""
    end_date: Optional[date] = None
    next_follow_up_at: Optional[date] = None
    status: Optional[ActivityStatus] = None
    notes: Optional[str] = None
    dynamic_payload: Optional[Dict[str, Any]] = None


class DevelopmentActivityLogResponse(DevelopmentActivityLogBase):
    """Esquema de respuesta para actividades"""
    id: int
    development_id: str
    created_by: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Información de la etapa
    stage_name: Optional[str] = None
    stage_code: Optional[str] = None
    
    class Config:
        from_attributes = True


class ActivityLogListResponse(BaseModel):
    """Respuesta para listado de actividades"""
    activities: List[DevelopmentActivityLogResponse]
    total: int
    page: int
    size: int


# Configuración de campos por etapa
STAGE_FIELD_CONFIGS = {
    "Aprobación Propuesta": {
        "fields": AprobacionPropuestaFields,
        "required_fields": ["proposal_id"],
        "optional_fields": ["proposal_version", "approver", "approval_date", "budget_approved"]
    },
    "Análisis": {
        "fields": AnalisisFields,
        "required_fields": [],
        "optional_fields": ["side_case_id", "servicepoint_case_id", "analyst_assigned", "scope_analysis", "requirements_count"]
    },
    "Despliegue (Pruebas)": {
        "fields": InstalacionPruebasFields,
        "required_fields": ["installer_number"],
        "optional_fields": ["environment", "change_window", "installation_notes", "version", "failure_type", "resolution_attempts", "next_actions"]
    },
    "Validación de Correcciones": {
        "fields": ValidacionCorreccionesFields,
        "required_fields": ["installer_number", "failure_description"],
        "optional_fields": ["original_stage_reference", "correction_requirements", "validation_notes", "provider_response", "correction_status", "expected_correction_date", "validation_result"]
    }
}


def get_stage_field_config(stage_name: str) -> Optional[Dict[str, Any]]:
    """Obtener configuración de campos para una etapa específica"""
    return STAGE_FIELD_CONFIGS.get(stage_name)


def validate_dynamic_payload(stage_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Validar payload dinámico según la etapa"""
    config = get_stage_field_config(stage_name)
    if not config:
        return payload
    
    # Validar campos requeridos
    for field in config["required_fields"]:
        if field not in payload or payload[field] is None:
            raise ValueError(f"Campo requerido '{field}' no encontrado para etapa '{stage_name}'")
    
    # Filtrar solo campos válidos
    valid_fields = config["required_fields"] + config["optional_fields"]
    filtered_payload = {k: v for k, v in payload.items() if k in valid_fields}
    
    return filtered_payload
