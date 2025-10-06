import { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../config/api';

interface RemedyCaseDetail {
  remedy_id: number;
  name: string;
  description: string;
  module: string;
  type: string;
  environment: string;
  remedy_link: string;
  general_status: string;
  current_phase?: {
    id: number;
    name: string;
    color: string;
  };
  current_stage?: {
    id: number;
    code: string;
    name: string;
    is_milestone: boolean;
    responsible_party: string;
  };
  progress_percentage: number;
  last_activity?: {
    id: number;
    stage_name: string;
    activity_type: string;
    status: string;
    created_at: string;
    notes: string;
  };
  activity_statistics: {
    total_activities: number;
    completed_activities: number;
    in_progress_activities: number;
    pending_activities: number;
  };
  provider: string;
  main_responsible: string;
  detailed_providers: Array<{
    provider_name: string;
    side_service_point: string;
    provider_system: string;
    status: string;
    created_at: string;
  }>;
  detailed_responsibles: Array<{
    user_name: string;
    role_type: string;
    area: string;
    assigned_date: string;
    is_primary: boolean;
    created_at: string;
  }>;
  important_dates: {
    created_at: string;
    updated_at: string;
    estimated_end_date: string;
  };
  scheduled_dates: Array<{
    date_type: string;
    scheduled_date: string;
    actual_date: string;
    notes: string;
  }>;
  quality_metrics: {
    returns_count: number;
    test_defects_count: number;
    estimated_cost: number;
  };
  post_production_incidents: Array<{
    id: number;
    description: string;
    severity: string;
    impact: string;
    status: string;
    assigned_to: string;
    report_date: string;
    resolution_date: string;
    response_time_hours: number;
    resolution_time_hours: number;
    is_rework: boolean;
  }>;
  proposals: Array<{
    proposal_number: string;
    proposal_type: string;
    status: string;
    submitted_date: string;
    approval_date: string;
    estimated_cost: number;
    notes: string;
  }>;
}

interface ReportSummary {
  total_cases: number;
  status_distribution: Record<string, number>;
  provider_distribution: Record<string, number>;
  module_distribution: Record<string, number>;
  generated_at: string;
  filters_applied: {
    status_filter?: string;
    provider_filter?: string;
    module_filter?: string;
    start_date?: string;
    end_date?: string;
  };
}

interface RemedyReportData {
  summary: ReportSummary;
  cases: RemedyCaseDetail[];
}

interface UseRemedyReportFilters {
  status_filter?: string;
  provider_filter?: string;
  module_filter?: string;
  start_date?: string;
  end_date?: string;
}

export const useRemedyReport = () => {
  const [data, setData] = useState<RemedyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UseRemedyReportFilters>({});

  const fetchReportData = async (customFilters?: UseRemedyReportFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const currentFilters = customFilters || filters;
      const queryParams = new URLSearchParams();
      
      if (currentFilters.status_filter) {
        queryParams.append('status_filter', currentFilters.status_filter);
      }
      if (currentFilters.provider_filter) {
        queryParams.append('provider_filter', currentFilters.provider_filter);
      }
      if (currentFilters.module_filter) {
        queryParams.append('module_filter', currentFilters.module_filter);
      }
      if (currentFilters.start_date) {
        queryParams.append('start_date', currentFilters.start_date);
      }
      if (currentFilters.end_date) {
        queryParams.append('end_date', currentFilters.end_date);
      }
      
      // Temporal: usar endpoint base mientras se corrige el endpoint específico
      const url = `${API_CONFIG.BASE_URL}/developments/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const developments = await response.json();
      
      // Convertir datos del endpoint base al formato del informe
      const reportData: RemedyReportData = {
        summary: {
          total_cases: developments.length,
          status_distribution: {},
          provider_distribution: {},
          module_distribution: {},
          generated_at: new Date().toISOString(),
          filters_applied: {
            status_filter: currentFilters.status_filter,
            provider_filter: currentFilters.provider_filter,
            module_filter: currentFilters.module_filter,
            start_date: currentFilters.start_date,
            end_date: currentFilters.end_date
          }
        },
        cases: developments.map((dev: any) => ({
          remedy_id: dev.id,
          name: dev.name,
          description: dev.description || '',
          module: dev.module || '',
          type: dev.type || '',
          environment: dev.environment || '',
          remedy_link: dev.remedy_link || '',
          general_status: dev.general_status || '',
          current_phase: dev.current_phase ? {
            id: dev.current_phase.id,
            name: dev.current_phase.phase_name,
            color: dev.current_phase.phase_color
          } : undefined,
          current_stage: dev.current_stage ? {
            id: dev.current_stage.id,
            code: dev.current_stage.stage_code,
            name: dev.current_stage.stage_name,
            is_milestone: dev.current_stage.is_milestone,
            responsible_party: dev.current_stage.responsible_party
          } : undefined,
          progress_percentage: dev.stage_progress_percentage || 0,
          last_activity: dev.last_activity,
          activity_statistics: {
            total_activities: 0,
            completed_activities: 0,
            in_progress_activities: 0,
            pending_activities: 0
          },
          provider: dev.provider || '',
          main_responsible: dev.responsible || '',
          detailed_providers: dev.providers || [],
          detailed_responsibles: dev.responsibles || [],
          important_dates: {
            created_at: dev.created_at,
            updated_at: dev.updated_at,
            estimated_end_date: dev.estimated_end_date
          },
          scheduled_dates: dev.dates || [],
          quality_metrics: {
            returns_count: dev.returns_count || 0,
            test_defects_count: dev.test_defects_count || 0,
            estimated_cost: dev.estimated_cost || 0
          },
          post_production_incidents: dev.incidents || [],
          proposals: dev.proposals || []
        }))
      };
      
      // Calcular distribuciones
      reportData.cases.forEach(caseItem => {
        const status = caseItem.general_status || 'Sin Estado';
        const provider = caseItem.provider || 'Sin Proveedor';
        const module = caseItem.module || 'Sin Módulo';
        
        reportData.summary.status_distribution[status] = (reportData.summary.status_distribution[status] || 0) + 1;
        reportData.summary.provider_distribution[provider] = (reportData.summary.provider_distribution[provider] || 0) + 1;
        reportData.summary.module_distribution[module] = (reportData.summary.module_distribution[module] || 0) + 1;
      });
      
      setData(reportData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar el informe';
      setError(errorMessage);
      console.error('Error fetching remedy report:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<UseRemedyReportFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchReportData(updatedFilters);
  };

  const clearFilters = () => {
    setFilters({});
    fetchReportData({});
  };

  const refreshReport = () => {
    fetchReportData();
  };

  // Cargar datos iniciales al montar el componente
  useEffect(() => {
    fetchReportData();
  }, []);

  return {
    data,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refreshReport,
    fetchReportData
  };
};
