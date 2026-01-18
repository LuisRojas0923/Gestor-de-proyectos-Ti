"""
Schemas Pydantic para desarrollos, fases y etapas
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# =====================================================================================
# SCHEMAS PARA DEVELOPMENT_PHASES
# =====================================================================================

class DevelopmentPhaseBase(BaseModel):
    """Schema base para fases de desarrollo"""
    phase_name: str = Field(..., max_length=100, description="Nombre de la fase")
    phase_description: Optional[str] = Field(None, description="Descripción de la fase")
    phase_color: Optional[str] = Field(None, max_length=20, description="Color de la fase")
    is_active: bool = Field(True, description="Si la fase está activa")
    sort_order: Optional[int] = Field(None, description="Orden de visualización")


class DevelopmentPhaseCreate(DevelopmentPhaseBase):
    """Schema para crear fase de desarrollo"""
    pass


class DevelopmentPhase(DevelopmentPhaseBase):
    """Schema completo para fase de desarrollo"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


# =====================================================================================
# SCHEMAS PARA DEVELOPMENT_STAGES
# =====================================================================================

class DevelopmentStageBase(BaseModel):
    """Schema base para etapas de desarrollo"""
    phase_id: int = Field(..., description="ID de la fase")
    stage_code: str = Field(..., max_length=20, description="Código de la etapa")
    stage_name: str = Field(..., max_length=255, description="Nombre de la etapa")
    stage_description: Optional[str] = Field(None, description="Descripción de la etapa")
    is_milestone: bool = Field(False, description="Si es un hito importante")
    estimated_days: Optional[int] = Field(None, ge=0, description="Días estimados")
    responsible_party: Optional[str] = Field(None, max_length=100, description="Parte responsable")
    sort_order: Optional[int] = Field(None, description="Orden dentro de la fase")
    is_active: bool = Field(True, description="Si la etapa está activa")

    @validator('responsible_party')
    def validate_responsible_party(cls, v):
        if v is None:
            return v
        allowed_parties = ['proveedor', 'usuario', 'equipo_interno']
        if v not in allowed_parties:
            raise ValueError(f'responsible_party debe ser uno de: {allowed_parties}')
        return v


class DevelopmentStageCreate(DevelopmentStageBase):
    """Schema para crear etapa de desarrollo"""
    pass


class DevelopmentStage(DevelopmentStageBase):
    """Schema completo para etapa de desarrollo"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        orm_mode = True


class DevelopmentStageWithPhase(DevelopmentStage):
    """Schema de etapa con información de la fase"""
    phase: DevelopmentPhase

    class Config:
        orm_mode = True
        orm_mode = True


class DevelopmentPhaseWithStages(DevelopmentPhase):
    """Schema de fase con sus etapas"""
    stages: List[DevelopmentStage] = []

    class Config:
        orm_mode = True
        orm_mode = True


class DevelopmentCycleFlow(BaseModel):
    """Schema para el flujo del ciclo de desarrollo"""
    stage_id: int
    stage_code: str
    stage_name: str
    stage_description: Optional[str]
    phase_id: int
    phase_name: str
    phase_color: Optional[str]
    is_milestone: bool
    estimated_days: Optional[int]
    responsible_party: Optional[str]
    responsible_party_name: str
    sort_order: Optional[int]

    class Config:
        orm_mode = True
        orm_mode = True


# =====================================================================================
# SCHEMAS PARA DEVELOPMENTS
# =====================================================================================

class DevelopmentBase(BaseModel):
    """Schema base para desarrollo"""
    nombre: str = Field(..., max_length=255, description="Nombre del desarrollo")
    descripcion: Optional[str] = Field(None, description="Descripción del desarrollo")
    modulo: Optional[str] = Field(None, max_length=100, description="Módulo")
    tipo: Optional[str] = Field(None, max_length=50, description="Tipo de desarrollo")
    ambiente: Optional[str] = Field(None, max_length=100, description="Ambiente")
    enlace_portal: Optional[str] = Field(None, description="Link del Portal")
    
    # Campos para ciclo de desarrollo
    fase_actual_id: Optional[int] = Field(None, description="ID de la fase actual")
    etapa_actual_id: Optional[int] = Field(None, description="ID de la etapa actual")
    porcentaje_progreso_etapa: Optional[Decimal] = Field(None, ge=0, le=100, description="Progreso de etapa")
    
    # Campos legacy para compatibilidad
    estado_general: Optional[str] = Field("Pendiente", max_length=50, description="Estado general")
    fecha_estimada_fin: Optional[date] = Field(None, description="Fecha estimada de fin")
    proveedor: Optional[str] = Field(None, max_length=100, description="Proveedor principal")
    responsable: Optional[str] = Field(None, max_length=255, description="Responsable principal del desarrollo")
    
    # Campos para importación de Excel - Información del responsable
    apellido_responsable: Optional[str] = Field(None, max_length=100, description="Apellidos del responsable")
    nombre_responsable: Optional[str] = Field(None, max_length=100, description="Nombre del responsable")

    @validator('estado_general')
    def validate_general_status(cls, v):
        if v is None:
            return "Pendiente"
        
        # Mapeo de estados del Excel a estados válidos de la aplicación
        status_mapping = {
            'Resuelto': 'Completado',
            'Resuelta': 'Completado',
            'Cerrado': 'Completado',
            'Cerrada': 'Completado',
            'Finalizado': 'Completado',
            'Finalizada': 'Completado',
            'Terminado': 'Completado',
            'Terminada': 'Completado',
            'En Progreso': 'En curso',
            'En Proceso': 'En curso',
            'En Desarrollo': 'En curso',
            'Abierto': 'En curso',
            'Abierta': 'En curso',
            'Nuevo': 'Pendiente',
            'Nueva': 'Pendiente',
            'Asignado': 'Pendiente',
            'Asignada': 'Pendiente',
            'Pendiente': 'Pendiente',
            'Cancelado': 'Cancelado',
            'Cancelada': 'Cancelado',
            'Rechazado': 'Cancelado',
            'Rechazada': 'Cancelado'
        }
        
        # Normalizar el estado (quitar espacios y convertir a título)
        normalized_status = str(v).strip().title()
        
        # Manejar casos especiales con espacios
        if normalized_status == "En Curso":
            return "En curso"
        
        # Buscar en el mapeo
        if normalized_status in status_mapping:
            return status_mapping[normalized_status]
        
        # Si no está en el mapeo, verificar si es un estado válido directo
        allowed_statuses = ['Pendiente', 'En curso', 'Completado', 'Cancelado']
        if normalized_status in allowed_statuses:
            return normalized_status
        
        # Si no se puede mapear, usar 'Pendiente' como valor por defecto
        print(f"⚠️ Estado no reconocido: '{v}' -> mapeado a 'Pendiente'")
        return "Pendiente"

    @validator('fecha_estimada_fin', pre=True)
    def validate_estimated_end_date(cls, v):
        if v is None or v == '':
            return None
        if isinstance(v, str):
            try:
                from datetime import datetime
                return datetime.strptime(v, '%Y-%m-%d').date()
            except ValueError:
                raise ValueError('estimated_end_date debe estar en formato YYYY-MM-DD')
        return v

    @validator('nombre', pre=True)
    def validate_name_length(cls, v):
        if v and len(str(v)) > 255:
            return str(v)[:255]  # Truncar si es muy largo
        return v

    @validator('modulo', pre=True)
    def validate_module_length(cls, v):
        if v and len(str(v)) > 100:
            return str(v)[:100]  # Truncar si es muy largo
        return v

    @validator('tipo', pre=True)
    def validate_type_length(cls, v):
        if v and len(str(v)) > 50:
            return str(v)[:50]  # Truncar si es muy largo
        return v

    @validator('ambiente', pre=True)
    def validate_environment_length(cls, v):
        if v and len(str(v)) > 100:
            return str(v)[:100]  # Truncar si es muy largo
        return v

    @validator('proveedor', pre=True)
    def validate_provider_length(cls, v):
        if v and len(str(v)) > 100:
            return str(v)[:100]  # Truncar si es muy largo
        return v

    @validator('responsable', pre=True)
    def validate_responsible_length(cls, v):
        if v and len(str(v)) > 255:
            return str(v)[:255]  # Truncar si es muy largo
        return v


class DevelopmentCreate(DevelopmentBase):
    """Schema para crear desarrollo"""
    id: str = Field(..., max_length=50, description="ID del desarrollo (No. de Solicitud)")

    @validator('id', pre=True)
    def validate_id_length(cls, v):
        if v and len(str(v)) > 50:
            return str(v)[:50]  # Truncar si es muy largo
        return v


class DevelopmentUpdate(BaseModel):
    """Schema para actualizar desarrollo"""
    name: Optional[str] = Field(None, max_length=255, description="Nombre del desarrollo")
    description: Optional[str] = Field(None, description="Descripción del desarrollo")
    module: Optional[str] = Field(None, max_length=100, description="Módulo")
    type: Optional[str] = Field(None, max_length=50, description="Tipo de desarrollo")
    environment: Optional[str] = Field(None, max_length=100, description="Ambiente")
    portal_link: Optional[str] = Field(None, description="Link del Portal")
    current_phase_id: Optional[int] = Field(None, description="ID de la fase actual")
    current_stage_id: Optional[int] = Field(None, description="ID de la etapa actual")
    stage_progress_percentage: Optional[Decimal] = Field(None, ge=0, le=100, description="Progreso de etapa")
    general_status: Optional[str] = Field(None, max_length=50, description="Estado general")
    estimated_end_date: Optional[date] = Field(None, description="Fecha estimada de fin")
    provider: Optional[str] = Field(None, max_length=100, description="Proveedor principal")
    responsible: Optional[str] = Field(None, max_length=255, description="Responsable principal del desarrollo")

    @validator('general_status')
    def validate_general_status(cls, v):
        if v is None:
            return v
        allowed_statuses = ['Pendiente', 'En curso', 'Completado', 'Cancelado']
        if v not in allowed_statuses:
            raise ValueError(f'general_status debe ser uno de: {allowed_statuses}')
        return v


class Development(DevelopmentBase):
    """Schema completo para desarrollo"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        orm_mode = True


class DevelopmentWithRelations(Development):
    """Schema de desarrollo con relaciones incluidas"""
    current_phase: Optional[DevelopmentPhase] = None
    current_stage: Optional[DevelopmentStage] = None
    # TODO: Agregar otras relaciones cuando se implementen los schemas


# =====================================================================================
# SCHEMAS PARA OBSERVACIONES/ACTIVIDADES
# =====================================================================================

class DevelopmentObservationBase(BaseModel):
    """Schema base para observaciones de desarrollo"""
    observation_type: str = Field(..., max_length=50, description="Tipo de observación")
    content: str = Field(..., description="Contenido de la observación")
    author: Optional[str] = Field(None, max_length=255, description="Autor de la observación")
    is_current: bool = Field(True, description="Si es la observación actual")

    @validator('observation_type')
    def validate_observation_type_base(cls, v):
        allowed_types = ['estado', 'seguimiento', 'problema', 'acuerdo']
        if v not in allowed_types:
            raise ValueError(f'observation_type debe ser uno de: {allowed_types}')
        return v


class DevelopmentObservationCreate(DevelopmentObservationBase):
    """Schema para crear observación"""
    pass


class DevelopmentObservationUpdate(BaseModel):
    """Schema para actualizar observación"""
    observation_type: Optional[str] = Field(None, max_length=50, description="Tipo de observación")
    content: Optional[str] = Field(None, description="Contenido de la observación")
    author: Optional[str] = Field(None, max_length=255, description="Autor de la observación")
    is_current: Optional[bool] = Field(None, description="Si es la observación actual")

    @validator('observation_type')
    def validate_observation_type_update(cls, v):
        if v is None:
            return v
        allowed_types = ['estado', 'seguimiento', 'problema', 'acuerdo']
        if v not in allowed_types:
            raise ValueError(f'observation_type debe ser uno de: {allowed_types}')
        return v


class DevelopmentObservation(DevelopmentObservationBase):
    """Schema completo para observación"""
    id: int
    development_id: str
    observation_date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        orm_mode = True


# =====================================================================================
# SCHEMAS PARA ACTUALIZACIÓN DE ETAPA
# =====================================================================================

class DevelopmentStageUpdate(BaseModel):
    """Schema para actualizar etapa de desarrollo"""
    stage_id: int = Field(..., description="ID de la nueva etapa")
    progress_percentage: Optional[Decimal] = Field(None, ge=0, le=100, description="Progreso de la etapa")
    changed_by: Optional[str] = Field(None, max_length=255, description="Usuario que realizó el cambio")
    notes: Optional[str] = Field(None, description="Notas del cambio")


class DevelopmentProgressUpdate(BaseModel):
    """Schema para actualizar progreso de desarrollo"""
    progress_percentage: Decimal = Field(..., ge=0, le=100, description="Progreso de la etapa")
    updated_by: Optional[str] = Field(None, max_length=255, description="Usuario que actualizó el progreso")
    notes: Optional[str] = Field(None, description="Notas de la actualización")


# =====================================================================================
# SCHEMAS PARA DEVELOPMENT_DATES
# =====================================================================================

class DevelopmentDateBase(BaseModel):
    """Schema base para fechas de desarrollo"""
    development_id: str = Field(..., max_length=50, description="ID del desarrollo")
    date_type: str = Field(..., max_length=50, description="Tipo de fecha")
    planned_date: Optional[date] = Field(None, description="Fecha planificada")
    actual_date: Optional[date] = Field(None, description="Fecha real")
    days_estimated: Optional[int] = Field(None, ge=0, description="Días estimados")
    days_actual: Optional[int] = Field(None, ge=0, description="Días reales")
    
    # Campos para indicadores de calidad
    delivery_status: Optional[str] = Field(None, max_length=50, description="Estado de entrega")
    approval_status: Optional[str] = Field(None, max_length=50, description="Estado de aprobación")
    functionality_count: Optional[int] = Field(0, ge=0, description="Número de funcionalidades")
    production_deployment_date: Optional[date] = Field(None, description="Fecha de despliegue a producción")
    delivery_compliance_score: Optional[Decimal] = Field(None, ge=0, le=100, description="Puntuación de cumplimiento")

    @validator('date_type')
    def validate_date_type(cls, v):
        allowed_types = ['inicio', 'fin_estimado', 'entrega', 'cierre', 'produccion']
        if v not in allowed_types:
            raise ValueError(f'date_type debe ser uno de: {allowed_types}')
        return v

    @validator('delivery_status')
    def validate_delivery_status(cls, v):
        if v is None:
            return v
        allowed_statuses = ['on_time', 'delayed', 'cancelled']
        if v not in allowed_statuses:
            raise ValueError(f'delivery_status debe ser uno de: {allowed_statuses}')
        return v

    @validator('approval_status')
    def validate_approval_status(cls, v):
        if v is None:
            return v
        allowed_statuses = ['approved_first_time', 'approved_with_returns', 'rejected']
        if v not in allowed_statuses:
            raise ValueError(f'approval_status debe ser uno de: {allowed_statuses}')
        return v


class DevelopmentDateCreate(DevelopmentDateBase):
    """Schema para crear fecha de desarrollo"""
    pass


class DevelopmentDate(DevelopmentDateBase):
    """Schema completo para fecha de desarrollo"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        orm_mode = True


# =====================================================================================
# SCHEMAS PARA DEVELOPMENT_PROPOSALS
# =====================================================================================

class DevelopmentProposalBase(BaseModel):
    """Schema base para propuestas de desarrollo"""
    development_id: str = Field(..., max_length=50, description="ID del desarrollo")
    proposal_number: str = Field(..., max_length=100, description="Número de propuesta")
    cost: Optional[Decimal] = Field(None, description="Costo de la propuesta")
    status: Optional[str] = Field(None, max_length=50, description="Estado de la propuesta")


class DevelopmentProposalCreate(DevelopmentProposalBase):
    """Schema para crear propuesta de desarrollo"""
    pass


class DevelopmentProposal(DevelopmentProposalBase):
    """Schema completo para propuesta de desarrollo"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        orm_mode = True


# =====================================================================================
# SCHEMAS PARA DEVELOPMENT_INSTALLERS
# =====================================================================================

# NOTA: Los esquemas de DevelopmentInstaller fueron eliminados
# Los instaladores ahora se manejan via dynamic_payload en development_activity_log
        orm_mode = True


# =====================================================================================
# SCHEMAS PARA DEVELOPMENT_PROVIDERS
# =====================================================================================

class DevelopmentProviderBase(BaseModel):
    """Schema base para proveedores de desarrollo"""
    development_id: str = Field(..., max_length=50, description="ID del desarrollo")
    provider_name: str = Field(..., max_length=100, description="Nombre del proveedor")
    side_service_point: Optional[str] = Field(None, max_length=100, description="SIDE/Service Point")
    provider_system: Optional[str] = Field(None, max_length=100, description="Sistema del proveedor")
    status: Optional[str] = Field(None, max_length=50, description="Estado con el proveedor")


class DevelopmentProviderCreate(DevelopmentProviderBase):
    """Schema para crear proveedor de desarrollo"""
    pass


class DevelopmentProvider(DevelopmentProviderBase):
    """Schema completo para proveedor de desarrollo"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        orm_mode = True


# =====================================================================================
# SCHEMAS PARA DEVELOPMENT_RESPONSIBLES
# =====================================================================================

class DevelopmentResponsibleBase(BaseModel):
    """Schema base para responsables de desarrollo"""
    development_id: str = Field(..., max_length=50, description="ID del desarrollo")
    user_name: str = Field(..., max_length=255, description="Nombre del usuario")
    role_type: str = Field(..., max_length=50, description="Tipo de rol")
    area: Optional[str] = Field(None, max_length=100, description="Área")
    is_primary: bool = Field(False, description="Responsable principal")
    assigned_date: Optional[date] = Field(None, description="Fecha de asignación")

    @validator('role_type')
    def validate_role_type(cls, v):
        allowed_roles = ['solicitante', 'tecnico', 'area']
        if v not in allowed_roles:
            raise ValueError(f'role_type debe ser uno de: {allowed_roles}')
        return v


class DevelopmentResponsibleCreate(DevelopmentResponsibleBase):
    """Schema para crear responsable de desarrollo"""
    pass


class DevelopmentResponsible(DevelopmentResponsibleBase):
    """Schema completo para responsable de desarrollo"""
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
        orm_mode = True


# =====================================================================================
# SCHEMAS PARA DEVELOPMENT_STATUS_HISTORY
# =====================================================================================

class DevelopmentStatusHistoryBase(BaseModel):
    """Schema base para historial de estados"""
    development_id: str = Field(..., max_length=50, description="ID del desarrollo")
    status: str = Field(..., max_length=50, description="Estado")
    progress_stage: Optional[str] = Field(None, max_length=100, description="Etapa de progreso")
    changed_by: Optional[str] = Field(None, max_length=255, description="Quien hizo el cambio")
    previous_status: Optional[str] = Field(None, max_length=50, description="Estado anterior")


class DevelopmentStatusHistoryCreate(DevelopmentStatusHistoryBase):
    """Schema para crear historial de estados"""
    pass


class DevelopmentStatusHistory(DevelopmentStatusHistoryBase):
    """Schema completo para historial de estados"""
    id: int
    change_date: datetime
    created_at: datetime

    class Config:
        orm_mode = True
        orm_mode = True


# =====================================================================================
# SCHEMAS PARA DEVELOPMENT_OBSERVATIONS
# =====================================================================================
# Nota: Los schemas de observaciones están definidos arriba en la línea 205


# =====================================================================================
# SCHEMAS ADICIONALES PARA RELACIONES
# =====================================================================================

class DevelopmentSummary(BaseModel):
    """Schema resumido para listados"""
    id: str
    name: str
    general_status: str
    provider: Optional[str] = None
    estimated_end_date: Optional[date] = None
    current_phase: Optional[str] = None
    current_stage: Optional[str] = None

    class Config:
        orm_mode = True
        orm_mode = True


class DevelopmentStatusChange(BaseModel):
    """Schema para cambio de estado"""
    new_status: str = Field(..., max_length=50, description="Nuevo estado")
    notes: Optional[str] = Field(None, description="Notas del cambio")

    @validator('new_status')
    def validate_new_status(cls, v):
        allowed_statuses = ['Pendiente', 'En curso', 'Completado', 'Cancelado']
        if v not in allowed_statuses:
            raise ValueError(f'new_status debe ser uno de: {allowed_statuses}')
        return v


class StageProgressUpdate(BaseModel):
    """Schema para actualización de progreso"""
    stage_id: int = Field(..., description="ID de la etapa")
    progress_percentage: Decimal = Field(..., ge=0, le=100, description="Porcentaje de progreso")
    notes: Optional[str] = Field(None, description="Notas del progreso")


# =====================================================================================
# SCHEMAS EXTENDIDOS PARA API V2
# =====================================================================================

class DevelopmentWithCurrentStatus(Development):
    """Schema de desarrollo con información de fase y etapa actual"""
    current_phase: Optional[DevelopmentPhase] = None
    current_stage: Optional[DevelopmentStage] = None
    last_activity: Optional[dict] = None

    class Config:
        orm_mode = True
        orm_mode = True


class DevelopmentWithFullDetails(DevelopmentWithCurrentStatus):
    """Schema de desarrollo con información completa"""
    dates: List[DevelopmentDate] = []
    proposals: List[DevelopmentProposal] = []
    # installers: List[DevelopmentInstaller] = []  # ELIMINADO - se usa dynamic_payload
    providers: List[DevelopmentProvider] = []
    responsibles: List[DevelopmentResponsible] = []

    class Config:
        orm_mode = True
        orm_mode = True


class DevelopmentCreateV2(DevelopmentCreate):
    """Schema mejorado para crear desarrollo con fases/etapas"""
    current_phase_id: Optional[int] = None
    current_stage_id: Optional[int] = None
    provider: Optional[str] = None
    general_status: Optional[str] = None
    estimated_end_date: Optional[date] = None


class DevelopmentStageUpdate(BaseModel):
    """Schema para actualizar etapa de desarrollo"""
    new_stage_id: int = Field(..., description="ID de la nueva etapa")
    progress_percentage: Optional[Decimal] = Field(None, ge=0, le=100, description="Porcentaje de progreso")
    notes: Optional[str] = Field(None, description="Notas del cambio")
    changed_by: Optional[str] = Field(None, description="Usuario que hace el cambio")

    class Config:
        orm_mode = True
        orm_mode = True
