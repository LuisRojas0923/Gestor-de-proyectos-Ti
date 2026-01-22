import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG, API_ENDPOINTS } from '../../../config/api';

interface PortalCaseDetail {
  portal_id: number;
  name: string;
  description: string;
  module: string;
  type: string;
  environment: string;
  portal_link: string;
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
    actor_type?: string;
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

interface PortalReportData {
  summary: ReportSummary;
  cases: PortalCaseDetail[];
}

interface CasoRaw {
  desarrollo_id: number;
  nombre_desarrollo: string;
  notas_actividad?: string;
  tipo_actividad?: string;
  estado_actividad?: string;
  nombre_etapa?: string;
  fecha_inicio_actividad?: string;
  fecha_fin_actividad?: string;
  tipo_actor?: string;
  proveedor?: string;
}

interface UsePortalReportFilters {
  status_filter?: string;
  provider_filter?: string;
  module_filter?: string;
  start_date?: string;
  end_date?: string;
}

interface ReportApiResponse {
  total_casos?: number;
  summary?: {
    status_distribution?: Record<string, number>;
    provider_distribution?: Record<string, number>;
  };
  casos?: CasoRaw[];
}

export const usePortalReport = () => {
  const [data, setData] = useState<PortalReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UsePortalReportFilters>({});

  const fetchReportData = useCallback(async (customFilters?: UsePortalReportFilters) => {
    setLoading(true);
    setError(null);

    try {
      const currentFilters = customFilters || filters;

      // Usar el nuevo endpoint del portal con filtros
      const queryParams = new URLSearchParams();
      if (currentFilters.status_filter) queryParams.append('status_filter', currentFilters.status_filter);
      if (currentFilters.provider_filter) queryParams.append('provider_filter', currentFilters.provider_filter);
      if (currentFilters.module_filter) queryParams.append('module_filter', currentFilters.module_filter);

      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.REPORTS_PORTAL_DETAILED}?${queryParams.toString()}`;

      const response = await fetch(url); // [CONTROLADO]

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const body = await response.json();
          errorDetail = body.detail || body.message || errorDetail;
        } catch { /* Ignorar si no es JSON */ }

        throw new Error(`Error ${response.status}: ${errorDetail}`);
      }

      const reportResponse = await response.json() as ReportApiResponse;

      // Usar los datos del portal directamente
      const reportData: PortalReportData = {
        summary: {
          total_cases: reportResponse.total_casos || 0,
          status_distribution: reportResponse.summary?.status_distribution || {},
          provider_distribution: reportResponse.summary?.provider_distribution || {},
          module_distribution: {}, // No disponible en el SP
          generated_at: new Date().toISOString(),
          filters_applied: {
            status_filter: currentFilters.status_filter,
            provider_filter: currentFilters.provider_filter,
            module_filter: currentFilters.module_filter,
            start_date: currentFilters.start_date,
            end_date: currentFilters.end_date
          }
        },
        cases: (reportResponse.casos || []).map((caso: CasoRaw) => ({
          portal_id: caso.desarrollo_id,
          name: caso.nombre_desarrollo,
          description: caso.notas_actividad || '',
          module: '', // No disponible en el portal
          type: caso.tipo_actividad || '',
          environment: '', // No disponible en el portal
          portal_link: '', // No disponible en el portal
          general_status: caso.estado_actividad || '',
          current_phase: undefined, // No disponible en el portal
          current_stage: undefined, // No disponible en el portal
          progress_percentage: 0, // No disponible en el portal
          last_activity: {
            id: 0,
            stage_name: caso.nombre_etapa || '',
            activity_type: caso.tipo_actividad || '',
            status: caso.estado_actividad || '',
            created_at: caso.fecha_inicio_actividad || '',
            notes: caso.notas_actividad || '',
            actor_type: caso.tipo_actor || ''
          },
          activity_statistics: {
            total_activities: 0,
            completed_activities: 0,
            in_progress_activities: 0,
            pending_activities: 0
          },
          provider: caso.proveedor || '',
          main_responsible: 'Luis Enrique Rojas Villota', // Filtro del SP
          detailed_providers: [],
          detailed_responsibles: [],
          important_dates: {
            created_at: caso.fecha_inicio_actividad || '',
            updated_at: caso.fecha_fin_actividad || '',
            estimated_end_date: caso.fecha_fin_actividad || ''
          },
          scheduled_dates: [],
          quality_metrics: {
            returns_count: 0,
            test_defects_count: 0,
            estimated_cost: 0
          },
          post_production_incidents: [],
          proposals: []
        }))
      };

      setData(reportData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar el informe';
      setError(errorMessage);
      console.error('Error fetching portal report:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = (newFilters: Partial<UsePortalReportFilters>) => {
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
  }, [fetchReportData]);

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
