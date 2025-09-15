// Tipos TypeScript para KPIs y métricas
// Basados en los esquemas reales del backend

export interface DevelopmentKpiMetric {
  id: number;
  development_id: string;
  metric_type: string;
  provider?: string;
  period_start?: string;
  period_end?: string;
  value?: number;
  target_value?: number;
  calculated_at: string;
  calculated_by?: string;
  created_at: string;
}

export interface DevelopmentFunctionality {
  id: number;
  development_id: string;
  functionality_name: string;
  functionality_code?: string;
  description?: string;
  status: 'delivered' | 'pending' | 'rejected' | 'in_progress';
  delivery_date?: string;
  defects_count: number;
  test_coverage_percentage?: number;
  complexity_level: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours?: number;
  actual_hours?: number;
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentQualityMetric {
  id: number;
  development_id: string;
  provider?: string;
  metric_type: string;
  metric_name: string;
  value?: number;
  target_value?: number;
  unit: 'percentage' | 'hours' | 'count' | 'days';
  calculation_method?: string;
  period_start?: string;
  period_end?: string;
  calculated_at: string;
  calculated_by?: string;
  is_current: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentTestResult {
  id: number;
  development_id: string;
  functionality_id?: number;
  test_type: 'unit' | 'integration' | 'system' | 'user_acceptance';
  test_phase?: 'development' | 'testing' | 'pre_production' | 'production';
  test_date?: string;
  test_status?: 'passed' | 'failed' | 'blocked' | 'not_executed';
  defects_found: number;
  defects_severity?: 'low' | 'medium' | 'high' | 'critical';
  test_coverage?: number;
  execution_time_hours?: number;
  tester_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface DevelopmentDeliveryHistory {
  id: number;
  development_id: string;
  delivery_version?: string;
  delivery_type: 'initial' | 'revision' | 'fix' | 'final';
  delivery_date?: string;
  delivery_status: 'delivered' | 'returned' | 'accepted' | 'rejected';
  return_reason?: string;
  return_count: number;
  approval_date?: string;
  approved_by?: string;
  quality_score?: number;
  defects_reported: number;
  defects_resolved: number;
  delivery_notes?: string;
  created_at: string;
  updated_at?: string;
}

// Tipos para creación y actualización
export interface KpiMetricCreate {
  development_id: string;
  metric_type: string;
  provider?: string;
  period_start?: string;
  period_end?: string;
  value?: number;
  target_value?: number;
  calculated_by?: string;
}

export interface FunctionalityCreate {
  development_id: string;
  functionality_name: string;
  functionality_code?: string;
  description?: string;
  status?: 'delivered' | 'pending' | 'rejected' | 'in_progress';
  delivery_date?: string;
  defects_count?: number;
  test_coverage_percentage?: number;
  complexity_level?: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours?: number;
  actual_hours?: number;
}

export interface TestResultCreate {
  development_id: string;
  functionality_id?: number;
  test_type: 'unit' | 'integration' | 'system' | 'user_acceptance';
  test_phase?: 'development' | 'testing' | 'pre_production' | 'production';
  test_date?: string;
  test_status?: 'passed' | 'failed' | 'blocked' | 'not_executed';
  defects_found?: number;
  defects_severity?: 'low' | 'medium' | 'high' | 'critical';
  test_coverage?: number;
  execution_time_hours?: number;
  tester_name?: string;
  notes?: string;
}

export interface DeliveryHistoryCreate {
  development_id: string;
  delivery_version?: string;
  delivery_type: 'initial' | 'revision' | 'fix' | 'final';
  delivery_date?: string;
  delivery_status: 'delivered' | 'returned' | 'accepted' | 'rejected';
  return_reason?: string;
  return_count?: number;
  approval_date?: string;
  approved_by?: string;
  quality_score?: number;
  defects_reported?: number;
  defects_resolved?: number;
  delivery_notes?: string;
}

// Tipos para filtros y consultas
export interface KpiFilters {
  provider?: string;
  metric_type?: string;
  period_start?: string;
  period_end?: string;
  development_id?: string;
}

export interface FunctionalityFilters {
  development_id?: string;
  status?: string;
  complexity_level?: string;
  provider?: string;
}

export interface TestResultFilters {
  development_id?: string;
  functionality_id?: number;
  test_type?: string;
  test_phase?: string;
  test_status?: string;
  defects_severity?: string;
}

export interface DeliveryHistoryFilters {
  development_id?: string;
  delivery_type?: string;
  delivery_status?: string;
  provider?: string;
  period_start?: string;
  period_end?: string;
}

// Tipos para respuestas de listas
export interface KpiMetricsResponse {
  metrics: DevelopmentKpiMetric[];
  total: number;
  skip: number;
  limit: number;
}

export interface FunctionalitiesResponse {
  functionalities: DevelopmentFunctionality[];
  total: number;
  skip: number;
  limit: number;
}

export interface TestResultsResponse {
  test_results: DevelopmentTestResult[];
  total: number;
  skip: number;
  limit: number;
}

export interface DeliveryHistoryResponse {
  delivery_history: DevelopmentDeliveryHistory[];
  total: number;
  skip: number;
  limit: number;
}

export interface QualityMetricsResponse {
  quality_metrics: DevelopmentQualityMetric[];
  total: number;
  skip: number;
  limit: number;
}
