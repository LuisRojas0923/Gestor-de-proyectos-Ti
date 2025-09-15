// Tipos TypeScript para alertas y actividades
// Basados en los esquemas reales del backend

export interface DevelopmentUpcomingActivity {
  id: number;
  development_id: string;
  activity_type: 'entrega_proveedor' | 'reunion' | 'entrega_usuario' | 'revision' | 'aprobacion' | 'despliegue' | 'pruebas' | 'documentacion';
  title: string;
  description?: string;
  due_date: string;
  responsible_party: 'proveedor' | 'usuario' | 'equipo_interno';
  responsible_person?: string;
  priority: 'Alta' | 'Media' | 'Baja' | 'Crítica';
  status: 'Pendiente' | 'Completado' | 'Vencido' | 'Cancelado';
  alert_sent: boolean;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface ActivityCreate {
  development_id: string;
  activity_type: 'entrega_proveedor' | 'reunion' | 'entrega_usuario' | 'revision' | 'aprobacion' | 'despliegue' | 'pruebas' | 'documentacion';
  title: string;
  description?: string;
  due_date: string;
  responsible_party: 'proveedor' | 'usuario' | 'equipo_interno';
  responsible_person?: string;
  priority: 'Alta' | 'Media' | 'Baja' | 'Crítica';
  created_by?: string;
}

export interface ActivityUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  responsible_party?: 'proveedor' | 'usuario' | 'equipo_interno';
  responsible_person?: string;
  priority?: 'Alta' | 'Media' | 'Baja' | 'Crítica';
  status?: 'Pendiente' | 'Completado' | 'Vencido' | 'Cancelado';
  completed_at?: string;
}

export interface ActivityFilters {
  development_id?: string;
  responsible_party?: 'proveedor' | 'usuario' | 'equipo_interno';
  priority?: 'Alta' | 'Media' | 'Baja' | 'Crítica';
  status_filter?: 'Pendiente' | 'Completado' | 'Vencido' | 'Cancelado';
  days_ahead?: number;
  skip?: number;
  limit?: number;
}

export interface UpcomingActivitiesResponse {
  activities: DevelopmentUpcomingActivity[];
  total: number;
  skip: number;
  limit: number;
}

export interface ActivityCompletion {
  status: 'Completado';
  completed_at: string;
  notes?: string;
}

// Tipos para notificaciones y alertas del sistema
export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  development_id?: string;
  activity_id?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  created_at: string;
  expires_at?: string;
}

export interface AlertFilters {
  type?: 'info' | 'warning' | 'error' | 'success';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  is_read?: boolean;
  development_id?: string;
  skip?: number;
  limit?: number;
}

export interface SystemAlertsResponse {
  alerts: SystemAlert[];
  total: number;
  skip: number;
  limit: number;
}

// Tipos para estadísticas de alertas
export interface AlertStatistics {
  total_alerts: number;
  unread_alerts: number;
  high_priority_alerts: number;
  overdue_activities: number;
  upcoming_activities: number;
  by_type: {
    info: number;
    warning: number;
    error: number;
    success: number;
  };
  by_priority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

// Tipos para configuración de alertas
export interface AlertConfiguration {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  reminder_days: number[];
  reminder_hours: number[];
  priority_filter: ('low' | 'medium' | 'high' | 'critical')[];
  activity_types: string[];
  created_at: string;
  updated_at?: string;
}

export interface AlertConfigurationUpdate {
  email_notifications?: boolean;
  push_notifications?: boolean;
  reminder_days?: number[];
  reminder_hours?: number[];
  priority_filter?: ('low' | 'medium' | 'high' | 'critical')[];
  activity_types?: string[];
}
