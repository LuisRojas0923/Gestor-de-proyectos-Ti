// Exportación centralizada de todos los tipos TypeScript
// Sistema de Gestión de Proyectos TI

// Tipos de desarrollo
export * from './development';

// Tipos de calidad
export * from './quality';

// Tipos de KPIs
export * from './kpi';

// Tipos de alertas
export * from './alerts';

// Tipos de chat e IA
export * from './chat';

// Tipos de actividades
export * from './activity';

// Tipos comunes y utilitarios
export interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface ErrorResponse {
  error: string;
  message: string;
  status_code: number;
  details?: Record<string, any>;
}

export interface SuccessResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// Tipos para filtros comunes
export interface BaseFilters {
  skip?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Tipos para fechas
export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface TimePeriod {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  start_date: string;
  end_date: string;
}

// Tipos para estadísticas
export interface Statistics {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  percentage_completed: number;
  average_duration: number;
}

// Tipos para métricas de rendimiento
export interface PerformanceMetrics {
  metric_name: string;
  current_value: number;
  target_value: number;
  previous_value: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

// Tipos para configuración del usuario
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  date_format: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  dashboard: {
    default_view: string;
    refresh_interval: number;
    show_metrics: string[];
  };
}

// Tipos para autenticación
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  avatar_url?: string;
  preferences?: UserPreferences;
  created_at: string;
  last_login?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
}
