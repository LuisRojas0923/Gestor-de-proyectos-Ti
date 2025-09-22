/**
 * Tipos para el sistema de bitácora inteligente
 */

export interface ActivityLogBase {
  stage_id: number;
  activity_type: 'nueva_actividad' | 'seguimiento' | 'cierre_etapa';
  start_date: string;
  end_date?: string;
  next_follow_up_at?: string;
  status: 'pendiente' | 'en_curso' | 'completada' | 'cancelada';
  actor_type: 'equipo_interno' | 'proveedor' | 'usuario';
  notes?: string;
  dynamic_payload?: Record<string, any>;
}

export interface ActivityLogCreate extends ActivityLogBase {}

export interface ActivityLogUpdate {
  end_date?: string;
  next_follow_up_at?: string;
  status?: 'pendiente' | 'en_curso' | 'completada' | 'cancelada';
  notes?: string;
  dynamic_payload?: Record<string, any>;
}

export interface ActivityLogResponse extends ActivityLogBase {
  id: number;
  development_id: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  stage_name?: string;
  stage_code?: string;
}

export interface ActivityLogListResponse {
  activities: ActivityLogResponse[];
  total: number;
  page: number;
  size: number;
}

export interface StageFieldConfig {
  stage_id: number;
  stage_name: string;
  stage_code: string;
  field_config?: {
    fields: any;
    required_fields: string[];
    optional_fields: string[];
  };
  has_dynamic_fields: boolean;
}

// Campos dinámicos por etapa
export interface AprobacionPropuestaFields {
  proposal_id: string;
  proposal_version?: string;
  approver?: string;
  approval_date?: string;
  budget_approved?: number;
}

export interface AnalisisFields {
  side_case_id?: string;
  servicepoint_case_id?: string;
  analyst_assigned?: string;
  scope_analysis?: string;
  requirements_count?: number;
}

export interface InstalacionPruebasFields {
  installer_number: string;
  environment?: string;
  change_window?: string;
  installation_notes?: string;
}

// Configuración de campos por etapa
export const STAGE_FIELD_CONFIGS: Record<string, {
  fields: any;
  required_fields: string[];
  optional_fields: string[];
  display_name: string;
  description: string;
}> = {
  'Aprobación Propuesta': {
    fields: null, // Se define dinámicamente
    required_fields: ['proposal_id'],
    optional_fields: ['proposal_version', 'approver', 'approval_date', 'budget_approved'],
    display_name: 'Aprobación de Propuesta',
    description: 'Gestión de aprobación de propuestas técnicas'
  },
  'Análisis': {
    fields: null,
    required_fields: [],
    optional_fields: ['side_case_id', 'servicepoint_case_id', 'analyst_assigned', 'scope_analysis', 'requirements_count'],
    display_name: 'Análisis',
    description: 'Análisis de requerimientos y casos de negocio'
  },
  'Despliegue (Pruebas)': {
    fields: null,
    required_fields: ['installer_number'],
    optional_fields: ['environment', 'change_window', 'installation_notes'],
    display_name: 'Instalación en Pruebas',
    description: 'Instalación y configuración en ambiente de pruebas'
  }
};

// Definición de campos del formulario
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  description?: string;
}

export interface StageFormConfig {
  stage_name: string;
  fields: FormField[];
}
