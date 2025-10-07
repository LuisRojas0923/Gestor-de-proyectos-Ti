// Tipos TypeScript basados en los esquemas reales del backend
// Sistema de Gestión de Proyectos TI

export interface DevelopmentPhase {
  id: number;
  phase_name: 'En Ejecución' | 'En Espera' | 'Finales / Otros';
  phase_description?: string;
  phase_color?: string;
  is_active: boolean;
  sort_order?: number;
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentPhaseWithStages extends DevelopmentPhase {
  stages: DevelopmentStage[];
}

export interface DevelopmentStage {
  id: number;
  phase_id: number;
  stage_code: string; // '0', '1', '2', '3', etc.
  stage_name: string;
  stage_description?: string;
  is_milestone: boolean;
  estimated_days?: number;
  responsible_party?: 'proveedor' | 'usuario' | 'equipo_interno';
  sort_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentStageWithPhase extends DevelopmentStage {
  phase: DevelopmentPhase;
}

export interface DevelopmentCycleFlow {
  stage_id: number;
  stage_code: string;
  stage_name: string;
  stage_description?: string;
  phase_id: number;
  phase_name: string;
  phase_color?: string;
  is_milestone: boolean;
  estimated_days?: number;
  responsible_party?: string;
  responsible_party_name: string;
  sort_order?: number;
}

export interface Development {
  id: string;
  name: string;
  description?: string;
  module?: string;
  type?: string;
  environment?: string;
  remedy_link?: string;
  
  // Sistema de fases y etapas
  current_phase_id?: number;
  current_stage_id?: number;
  stage_progress_percentage?: number; // 0-100
  
  // Campos legacy (mantener compatibilidad)
  general_status: 'Pendiente' | 'En curso' | 'Completado' | 'Cancelado';
  estimated_end_date?: string;
  provider?: string;
  responsible?: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentWithCurrentStatus extends Development {
  // Relaciones incluidas
  current_phase?: DevelopmentPhase;
  current_stage?: DevelopmentStage;
  providers?: DevelopmentProvider[];
  responsibles?: DevelopmentResponsible[];
  // Observaciones/actividades (para compatibilidad con frontend actual)
  activities?: Array<{
    date: string;
    description: string;
  }>;
  // Última actividad de la bitácora
  last_activity?: {
    id: number;
    activity_type: 'nueva_actividad' | 'seguimiento' | 'cierre_etapa' | 'cambio_etapa' | 'observacion';
    actor_type: 'equipo_interno' | 'proveedor' | 'usuario' | 'sistema';
    status: 'pendiente' | 'en_curso' | 'completada' | 'cancelada';
    stage_name: string;
    notes?: string;
    created_at: string;
  };
  // Campos adicionales del frontend actual
  requesting_area?: string;
  main_responsible?: string;
  start_date?: string;
  estimated_days?: number;
  // Campos para importación de Excel
  responsible_lastname?: string;
  responsible_firstname?: string;
  incidents?: Array<{
    id: number;
    description: string;
    report_date: string;
    resolution_date?: string;
    status: 'Abierta' | 'Cerrada';
  }>;
}

export interface DevelopmentCreate {
  name: string;
  description?: string;
  module?: string;
  type?: string;
  environment?: string;
  remedy_link?: string;
  current_phase_id?: number;
  current_stage_id?: number;
  responsible?: string;
}

export interface DevelopmentUpdate {
  name?: string;
  description?: string;
  module?: string;
  type?: string;
  environment?: string;
  remedy_link?: string;
  current_phase_id?: number;
  current_stage_id?: number;
  stage_progress_percentage?: number;
  general_status?: 'Pendiente' | 'En curso' | 'Completado' | 'Cancelado';
  provider?: string;
  responsible?: string;
}

export interface DevelopmentDate {
  id: number;
  development_id: string;
  date_type: 'inicio' | 'fin_estimado' | 'entrega' | 'cierre' | 'produccion';
  planned_date?: string;
  actual_date?: string;
  days_estimated?: number;
  days_actual?: number;
  delivery_status?: 'on_time' | 'delayed' | 'cancelled';
  approval_status?: 'approved_first_time' | 'approved_with_returns' | 'rejected';
  functionality_count?: number;
  production_deployment_date?: string;
  delivery_compliance_score?: number;
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentProposal {
  id: number;
  development_id: string;
  proposal_number: string;
  cost?: number;
  status?: string;
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentInstaller {
  id: number;
  development_id: string;
  installer_number?: string;
  version?: string;
  environment?: string;
  installation_date?: string;
  status?: string;
  created_at: string;
}

export interface DevelopmentProvider {
  id: number;
  development_id: string;
  provider_name: string;
  side_service_point?: string;
  provider_system?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentResponsible {
  id: number;
  development_id: string;
  user_name: string;
  role_type: 'solicitante' | 'tecnico' | 'area';
  area?: string;
  is_primary: boolean;
  assigned_date?: string;
  created_at: string;
}

export interface DevelopmentStatusHistory {
  id: number;
  development_id: string;
  status: string;
  progress_stage?: string;
  change_date: string;
  changed_by?: string;
  previous_status?: string;
  created_at: string;
}

export interface DevelopmentObservation {
  id: number;
  development_id: string;
  observation_type: 'estado' | 'seguimiento' | 'problema' | 'acuerdo';
  content: string;
  author?: string;
  observation_date: string;
  is_current: boolean;
  created_at: string;
  updated_at?: string;
}

// Tipos para crear y actualizar observaciones
export interface DevelopmentObservationCreate {
  observation_type: 'estado' | 'seguimiento' | 'problema' | 'acuerdo';
  content: string;
  author?: string;
  is_current?: boolean;
}

export interface DevelopmentObservationUpdate {
  observation_type?: 'estado' | 'seguimiento' | 'problema' | 'acuerdo';
  content?: string;
  author?: string;
  is_current?: boolean;
}

// Tipos para cambio de etapa y progreso
export interface DevelopmentStageUpdate {
  stage_id: number;
  progress_percentage?: number;
  changed_by?: string;
  notes?: string;
}

export interface DevelopmentProgressUpdate {
  progress_percentage: number;
  updated_by?: string;
  notes?: string;
}

// Tipos para filtros y consultas
export interface DevelopmentFilters {
  skip?: number;
  limit?: number;
  phase_id?: number;
  stage_id?: number;
  provider?: string;
  module?: string;
  type?: string;
  status?: string;
}

export interface DevelopmentListResponse {
  developments: DevelopmentWithCurrentStatus[];
  total: number;
  skip: number;
  limit: number;
}
