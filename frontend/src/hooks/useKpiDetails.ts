import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { API_ENDPOINTS } from '../config/api';

export interface KpiDetail {
  development_id: string;
  development_name: string;
  provider_original: string;
  provider_homologado: string;
  fecha_compromiso_original: string | null;
  fecha_real_entrega: string | null;
  fecha_analisis_comprometida: string | null;
  fecha_real_propuesta: string | null;
  fecha_propuesta_comprometida: string | null;
  fecha_real_aprobacion: string | null;
  dias_desviacion: number;
  estado_entrega: string;
  total_entregas_desarrollo: number;
  total_entregas_analisis: number;
  total_entregas_propuesta: number;
  actividad_entrega_id: number;
  actividad_despliegue_id: number | null;
  actividad_analisis_id: number;
  actividad_propuesta_id: number | null;
  actividad_aprobacion_id: number | null;
}

export interface CalidadPrimeraEntregaDetail {
  development_id: string;
  development_name: string;
  provider_original: string;
  provider_homologado: string;
  fecha_entrega: string | null;
  fecha_devolucion: string | null;
  estado_calidad: string;
  actividad_entrega_id: number;
  actividad_devolucion_id: number | null;
}

export interface KpiSummary {
  total_entregas: number;
  entregas_a_tiempo: number;
  entregas_tardias: number;
  porcentaje_cumplimiento: number;
  provider_filter: string | null;
  period_start: string | null;
  period_end: string | null;
}

export interface KpiDetailsResponse {
  summary: KpiSummary;
  details: KpiDetail[];
}

export interface CalidadPrimeraEntregaResponse {
  summary: {
    total_entregas: number;
    entregas_sin_devoluciones: number;
    entregas_con_devoluciones: number;
    porcentaje_calidad: number;
    provider_filter: string | null;
    period: { start: string | null; end: string | null };
  };
  details: CalidadPrimeraEntregaDetail[];
}

export const useKpiDetails = () => {
  const { get } = useApi<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDevelopmentComplianceDetails = useCallback(async (
    provider?: string,
    periodStart?: string,
    periodEnd?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (provider && provider !== 'all') {
        params.append('provider', provider);
      }
      if (periodStart) {
        params.append('period_start', periodStart);
      }
      if (periodEnd) {
        params.append('period_end', periodEnd);
      }

      const endpoint = `${API_ENDPOINTS.KPI_DEVELOPMENT_COMPLIANCE_DETAILS}${params.toString() ? `?${params.toString()}` : ''
        }`;

      const response = await get(endpoint);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [get]);

  const getAnalysisComplianceDetails = useCallback(async (
    provider?: string,
    periodStart?: string,
    periodEnd?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (provider && provider !== 'all') {
        params.append('provider', provider);
      }
      if (periodStart) {
        params.append('period_start', periodStart);
      }
      if (periodEnd) {
        params.append('period_end', periodEnd);
      }

      const endpoint = `${API_ENDPOINTS.KPI_ANALYSIS_COMPLIANCE_DETAILS}${params.toString() ? `?${params.toString()}` : ''
        }`;

      const response = await get(endpoint);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [get]);

  const getProposalComplianceDetails = useCallback(async (
    provider?: string,
    periodStart?: string,
    periodEnd?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (provider && provider !== 'all') {
        params.append('provider', provider);
      }
      if (periodStart) {
        params.append('period_start', periodStart);
      }
      if (periodEnd) {
        params.append('period_end', periodEnd);
      }

      const endpoint = `${API_ENDPOINTS.KPI_PROPOSAL_COMPLIANCE_DETAILS}${params.toString() ? `?${params.toString()}` : ''
        }`;

      const response = await get(endpoint);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [get]);

  const getGlobalCompleteComplianceDetails = useCallback(async (
    provider?: string,
    periodStart?: string,
    periodEnd?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (provider && provider !== 'all') {
        params.append('provider', provider);
      }
      if (periodStart) {
        params.append('period_start', periodStart);
      }
      if (periodEnd) {
        params.append('period_end', periodEnd);
      }

      const endpoint = `${API_ENDPOINTS.KPI_GLOBAL_COMPLETE_COMPLIANCE_DETAILS}${params.toString() ? `?${params.toString()}` : ''
        }`;

      const response = await get(endpoint);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [get]);

  const getCalidadPrimeraEntregaDetails = useCallback(async (
    provider?: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<CalidadPrimeraEntregaResponse> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (provider) {
        params.append('provider', provider);
      }
      if (periodStart) {
        params.append('period_start', periodStart);
      }
      if (periodEnd) {
        params.append('period_end', periodEnd);
      }

      const endpoint = `/indicadores/calidad-primera-entrega/details${params.toString() ? `?${params.toString()}` : ''
        }`;

      const response = await get(endpoint);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [get]);

  return {
    getDevelopmentComplianceDetails,
    getAnalysisComplianceDetails,
    getProposalComplianceDetails,
    getGlobalCompleteComplianceDetails,
    getCalidadPrimeraEntregaDetails,
    loading,
    error
  };
};
