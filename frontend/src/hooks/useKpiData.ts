import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { API_ENDPOINTS } from '../config/api';

// Interfaces para los datos de KPIs
export interface KpiData {
  globalCompliance: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  globalCompleteCompliance: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  analysisCompliance: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  proposalCompliance: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  calidadPrimeraEntrega: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  developmentComplianceDays: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  firstTimeQuality: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  failureResponseTime: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  defectsPerDelivery: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  postProductionRework: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  installerResolutionTime: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
}

export interface ProviderQualityData {
  name: string;
  quality: number;
  color: string;
}

export interface DashboardResponse {
  global_compliance: {
    current_value: number;
    change_percentage: number;
    trend: string;
  };
  global_complete_compliance?: {
    current_value: number;
    change_percentage: number;
    trend: string;
  };
  analysis_compliance?: {
    current_value: number;
    change_percentage: number;
    trend: string;
  };
  proposal_compliance?: {
    current_value: number;
    change_percentage: number;
    trend: string;
  };
  calidad_primera_entrega?: {
    current_value: number;
    change_percentage: number;
    trend: string;
  };
  first_time_quality: {
    current_value: number;
    rejection_rate: number;
  };
  failure_response_time: {
    current_value: number;
    change: { value: number; type: string };
  };
  defects_per_delivery: {
    current_value: number;
    total_defects: number;
  };
  post_production_rework: {
    current_value: number;
    change: { value: number; type: string };
  };
  period: {
    start: string;
    end: string;
    description: string;
  };
  updated_at: string;
  provider_quality?: ProviderQualityData[];
  development_compliance_days?: {
    current_value: number;
    change: { value: number; type: string };
    total_deliveries?: number;
  };
  installer_resolution_time?: {
    current_value: number;
    change: { value: number; type: string };
    total_devoluciones?: number;
    total_resueltas?: number;
    resolution_rate?: number;
  };
}

export interface ProvidersResponse {
  providers: string[];
}

// Datos por defecto para el gráfico
const defaultProviderQualityData: ProviderQualityData[] = [
  { name: 'Ingesoft', quality: 95, color: '#10B981' },
  { name: 'TI Interno', quality: 88, color: '#0066A5' },
  { name: 'ORACLE', quality: 72, color: '#EF4444' },
  { name: 'ITC', quality: 91, color: '#10B981' },
];

export const useKpiData = (selectedProvider: string = 'all') => {
  const { get } = useApi<DashboardResponse>();
  const [kpiData, setKpiData] = useState<KpiData>({
    globalCompliance: { value: 0, change: { value: 0, type: 'increase' } },
    globalCompleteCompliance: { value: 0, change: { value: 0, type: 'increase' } },
    analysisCompliance: { value: 0, change: { value: 0, type: 'increase' } },
    proposalCompliance: { value: 0, change: { value: 0, type: 'increase' } },
    calidadPrimeraEntrega: { value: 0, change: { value: 0, type: 'increase' } },
    developmentComplianceDays: { value: 0, change: { value: 0, type: 'decrease' } },
    firstTimeQuality: { value: 0, change: { value: 0, type: 'decrease' } },
    failureResponseTime: { value: 0, change: { value: 0, type: 'decrease' } },
    defectsPerDelivery: { value: 0, change: { value: 0, type: 'increase' } },
    postProductionRework: { value: 0, change: { value: 0, type: 'decrease' } },
    installerResolutionTime: { value: 0, change: { value: 0, type: 'decrease' } },
  });

  const [providerQualityData, setProviderQualityData] = useState<ProviderQualityData[]>(defaultProviderQualityData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para mapear datos del backend al formato del frontend
  const mapBackendDataToFrontend = useCallback((response: DashboardResponse): KpiData => {
    return {
      globalCompliance: {
        value: response.global_compliance?.current_value || 0,
        change: {
          value: Math.abs(response.global_compliance?.change_percentage || 0),
          type: (response.global_compliance?.change_percentage || 0) >= 0 ? 'increase' : 'decrease'
        }
      },
      globalCompleteCompliance: {
        value: response.global_complete_compliance?.current_value || 0,
        change: {
          value: Math.abs(response.global_complete_compliance?.change_percentage || 0),
          type: (response.global_complete_compliance?.change_percentage || 0) >= 0 ? 'increase' : 'decrease'
        }
      },
      analysisCompliance: {
        value: response.analysis_compliance?.current_value || 0,
        change: {
          value: Math.abs(response.analysis_compliance?.change_percentage || 0),
          type: (response.analysis_compliance?.change_percentage || 0) >= 0 ? 'increase' : 'decrease'
        }
      },
      proposalCompliance: {
        value: response.proposal_compliance?.current_value || 0,
        change: {
          value: Math.abs(response.proposal_compliance?.change_percentage || 0),
          type: (response.proposal_compliance?.change_percentage || 0) >= 0 ? 'increase' : 'decrease'
        }
      },
      calidadPrimeraEntrega: {
        value: response.calidad_primera_entrega?.current_value || 0,
        change: {
          value: Math.abs(response.calidad_primera_entrega?.change_percentage || 0),
          type: (response.calidad_primera_entrega?.change_percentage || 0) >= 0 ? 'increase' : 'decrease'
        }
      },
      developmentComplianceDays: {
        value: response.development_compliance_days?.current_value ?? 0,
        change: (response.development_compliance_days?.change as { value: number; type: 'increase' | 'decrease' }) || { value: 0, type: 'decrease' }
      },
      firstTimeQuality: {
        value: response.first_time_quality?.current_value || 0,
        change: {
          value: response.first_time_quality?.rejection_rate || 0,
          type: 'decrease'
        }
      },
      failureResponseTime: {
        value: response.failure_response_time?.current_value || 0,
        change: (response.failure_response_time?.change as { value: number; type: 'increase' | 'decrease' }) || { value: 0, type: 'decrease' }
      },
      defectsPerDelivery: {
        value: response.defects_per_delivery?.current_value || 0,
        change: { value: 0.3, type: 'increase' } // TODO: Obtener del backend
      },
      postProductionRework: {
        value: response.post_production_rework?.current_value || 0,
        change: (response.post_production_rework?.change as { value: number; type: 'increase' | 'decrease' }) || { value: 0, type: 'decrease' }
      },
      installerResolutionTime: {
        value: response.installer_resolution_time?.current_value || 0,
        change: (response.installer_resolution_time?.change as { value: number; type: 'increase' | 'decrease' }) || { value: 0, type: 'decrease' }
      }
    };
  }, []);

  // Cargar datos de KPIs
  const loadKpiData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = selectedProvider === 'all'
        ? API_ENDPOINTS.KPI_DASHBOARD
        : `${API_ENDPOINTS.KPI_DASHBOARD}?provider=${encodeURIComponent(selectedProvider)}`;

      // console.log('🔍 Cargando KPIs desde:', endpoint);
      // console.log('🏢 Proveedor seleccionado:', selectedProvider);

      const response = await get(endpoint);

      // console.log('📊 Respuesta completa del backend:', response);

      if (response) {
        // Log detallado removido - funcionando correctamente
        const mappedData = mapBackendDataToFrontend(response);
        setKpiData(mappedData);

        // Actualizar datos del gráfico de calidad por proveedor
        if (response.provider_quality && response.provider_quality.length > 0) {
          // console.log('📊 Usando datos de calidad del backend:', response.provider_quality);
          setProviderQualityData(response.provider_quality);
        } else {
          // console.log('⚠️ No hay datos de calidad del backend, usando datos por defecto');
          setProviderQualityData(defaultProviderQualityData);
        }
      } else {
        console.log('❌ No se recibió respuesta del backend');
      }
    } catch (err) {
      console.error('❌ Error cargando datos de KPIs:', err);
      setError('Error al cargar los indicadores. Usando datos por defecto.');
    } finally {
      setLoading(false);
    }
  }, [get, selectedProvider, mapBackendDataToFrontend]);

  // Cargar datos cuando cambia el proveedor seleccionado
  useEffect(() => {
    loadKpiData();
  }, [loadKpiData]);

  return {
    kpiData,
    providerQualityData,
    loading,
    error,
    refetch: loadKpiData
  };
};

// Hook para manejar proveedores
export const useProviders = () => {
  const { get } = useApi<ProvidersResponse>();
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await get('/indicadores/providers');
      if (response && response.providers) {
        setAvailableProviders(response.providers);
      }
    } catch (err) {
      console.error('Error cargando proveedores:', err);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    availableProviders,
    loading,
    refetch: loadProviders
  };
};

// Hook para debug de KPIs
export const useKpiDebug = () => {
  const { get } = useApi<any>();

  const debugKpiCalculations = useCallback(async (provider?: string) => {
    try {
      const endpoint = provider
        ? `/indicadores/_debug/dashboard-calculation?provider=${encodeURIComponent(provider)}`
        : '/indicadores/_debug/dashboard-calculation';

      console.log('🔍 Debugging KPI calculations from:', endpoint);
      const response = await get(endpoint);
      console.log('🐛 Debug response:', response);
      return response;
    } catch (err) {
      console.error('❌ Error en debug de KPIs:', err);
      return null;
    }
  }, [get]);

  return {
    debugKpiCalculations
  };
};
