// Tipos para el sistema de actividades/bitácora
export interface Activity {
  id: number;
  development_id: number;
  activity_type: 'nueva_actividad' | 'seguimiento' | 'cierre_etapa' | 'cambio_etapa' | 'observacion';
  actor_type: 'equipo_interno' | 'proveedor' | 'usuario' | 'sistema';
  status: 'pendiente' | 'en_curso' | 'completada' | 'cancelada';
  stage_id: number;
  stage_name: string;
  notes?: string;
  start_date?: string;
  end_date?: string;
  next_follow_up_at?: string;
  created_at: string;
  updated_at: string;
  dynamic_payload?: Record<string, any>;
}

export interface ActivityFormData {
  activity_type: Activity['activity_type'];
  actor_type: Activity['actor_type'];
  stage_id: number;
  notes?: string;
  start_date?: string;
  end_date?: string;
  next_follow_up_at?: string;
  dynamic_payload?: Record<string, any>;
}

export interface ActivityEditForm {
  status: Activity['status'];
  notes?: string;
  next_follow_up_at?: string;
  start_date?: string;
  end_date?: string;
}

export interface ActivityDeleteModal {
  isOpen: boolean;
  activityId: number | null;
  activity: Activity | null;
}

export interface ActivityEditModal {
  isOpen: boolean;
  activity: Activity | null;
  form: ActivityEditForm | null;
}

export interface ActivityValidationError {
  field: string;
  message: string;
}

// Tipos para respuestas de API de actividades
export interface ActivityListResponse {
  activities: Activity[];
  total: number;
  page: number;
  limit: number;
}

export interface ActivityCreateResponse {
  success: boolean;
  activity: Activity;
  message: string;
}

export interface ActivityUpdateResponse {
  success: boolean;
  activity: Activity;
  message: string;
}

export interface ActivityDeleteResponse {
  success: boolean;
  message: string;
}
