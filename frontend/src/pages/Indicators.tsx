import { AlertTriangle, BarChart3, Bug, CheckCircle, Clock, Repeat, TrendingUp } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MetricCard } from '../components/molecules';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';


// Datos por defecto para el gráfico (se reemplazan con datos reales del backend)
const defaultProviderQualityData = [
    { name: 'Ingesoft', quality: 95, color: '#10B981' },
    { name: 'TI Interno', quality: 88, color: '#0066A5' },
    { name: 'ORACLE', quality: 72, color: '#EF4444' },
    { name: 'ITC', quality: 91, color: '#10B981' },
];


// Interfaces para los datos de KPIs
interface KpiData {
  globalCompliance: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  developmentComplianceDays: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  firstTimeQuality: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  failureResponseTime: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  defectsPerDelivery: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  postProductionRework: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
  installerResolutionTime: { value: number; change: { value: number; type: 'increase' | 'decrease' } };
}

interface DashboardResponse {
  global_compliance: {
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
  // Datos de calidad por proveedor
  provider_quality?: Array<{
    name: string;
    quality: number;
    color: string;
  }>;
  // Nuevo: desviación de días de cumplimiento de fechas (backend)
  development_compliance_days?: {
    current_value: number;
    change: { value: number; type: string };
    total_deliveries?: number;
  };
  // Nuevo: tiempo de resolución de instaladores devueltos (backend)
  installer_resolution_time?: {
    current_value: number;
    change: { value: number; type: string };
    total_devoluciones?: number;
    total_resueltas?: number;
    resolution_rate?: number;
  };
}

const Indicators: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const { get } = useApi<DashboardResponse>();

  // Estados para manejar la carga de datos
  const [kpiData, setKpiData] = useState<KpiData>({
    globalCompliance: { value: 0, change: { value: 0, type: 'increase' } },
    developmentComplianceDays: { value: 0, change: { value: 0, type: 'decrease' } },
    firstTimeQuality: { value: 0, change: { value: 0, type: 'decrease' } },
    failureResponseTime: { value: 0, change: { value: 0, type: 'decrease' } },
    defectsPerDelivery: { value: 0, change: { value: 0, type: 'increase' } },
    postProductionRework: { value: 0, change: { value: 0, type: 'decrease' } },
    installerResolutionTime: { value: 0, change: { value: 0, type: 'decrease' } },
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerQualityData, setProviderQualityData] = useState(defaultProviderQualityData);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  // Cargar proveedores disponibles
  useEffect(() => {
    const loadProviders = async () => {
      try {
        console.log('🔍 Cargando proveedores disponibles...');
        const response = await get('/kpi/providers');
        console.log('📊 Respuesta de proveedores:', response);
        if (response && response.providers) {
          setAvailableProviders(response.providers);
          console.log('✅ Proveedores cargados:', response.providers);
        }
      } catch (err) {
        console.error('❌ Error cargando proveedores:', err);
      }
    };
    loadProviders();
  }, [get]);

  // Cargar datos de KPIs desde el backend
  useEffect(() => {
    const loadKpiData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const endpoint = selectedProvider === 'all' 
          ? API_ENDPOINTS.KPI_DASHBOARD 
          : `${API_ENDPOINTS.KPI_DASHBOARD}?provider=${encodeURIComponent(selectedProvider)}`;
        
        console.log('🔍 Cargando datos de KPIs...');
        console.log('📡 Endpoint:', endpoint);
        console.log('🏢 Proveedor seleccionado:', selectedProvider);
        
        const response = await get(endpoint);
        console.log('📊 Respuesta completa del dashboard:', response);
        
        if (response) {
          console.log('📈 Datos específicos de KPIs:');
          console.log('  - global_compliance:', response.global_compliance);
          console.log('  - development_compliance_days:', response.development_compliance_days);
          console.log('  - first_time_quality:', response.first_time_quality);
          console.log('  - failure_response_time:', response.failure_response_time);
          console.log('  - defects_per_delivery:', response.defects_per_delivery);
          console.log('  - post_production_rework:', response.post_production_rework);
          console.log('  - installer_resolution_time:', response.installer_resolution_time);
          console.log('  - provider_quality:', response.provider_quality);
          
          // Mapear la respuesta del backend al formato esperado por el frontend
          const mappedKpiData = {
            globalCompliance: {
              value: response.global_compliance?.current_value || 0,
              change: {
                value: Math.abs(response.global_compliance?.change_percentage || 0),
                type: (response.global_compliance?.change_percentage || 0) >= 0 ? 'increase' : 'decrease'
              }
            },
            developmentComplianceDays: {
              value: response.development_compliance_days?.current_value ?? 0,
              change: response.development_compliance_days?.change || { value: 0, type: 'decrease' }
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
              change: response.failure_response_time?.change || { value: 0, type: 'decrease' }
            },
            defectsPerDelivery: {
              value: response.defects_per_delivery?.current_value || 0,
              change: { value: 0.3, type: 'increase' }
            },
            postProductionRework: {
              value: response.post_production_rework?.current_value || 0,
              change: response.post_production_rework?.change || { value: 0, type: 'decrease' }
            },
            installerResolutionTime: {
              value: response.installer_resolution_time?.current_value || 0,
              change: response.installer_resolution_time?.change || { value: 0, type: 'decrease' }
            }
          };
          
          console.log('🎯 Datos mapeados para el frontend:', mappedKpiData);
          setKpiData(mappedKpiData);

          // Actualizar datos del gráfico de calidad por proveedor
          if (response.provider_quality && response.provider_quality.length > 0) {
            console.log('📊 Datos de calidad por proveedor del backend:', response.provider_quality);
            setProviderQualityData(response.provider_quality);
          } else {
            console.log('⚠️ No hay datos de calidad por proveedor, usando datos por defecto');
            setProviderQualityData(defaultProviderQualityData);
          }
        }
      } catch (err) {
        console.error('❌ Error cargando datos de KPIs:', err);
        setError('Error al cargar los indicadores. Usando datos por defecto.');
        // Mantener datos por defecto en caso de error
      } finally {
        console.log('✅ Carga de KPIs completada');
        setLoading(false);
      }
    };

    loadKpiData();
  }, [get, selectedProvider]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Indicadores de Gestión (KPIs)
        </h1>
        <div className="flex items-center space-x-4">
          {/* Selector de Proveedor */}
          <div className="flex items-center space-x-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Proveedor:
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                console.log('🔄 Cambiando proveedor a:', e.target.value);
                setSelectedProvider(e.target.value);
              }}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-neutral-700 border-neutral-600 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'
              } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
            >
              <option value="all">Todos los Proveedores</option>
              {availableProviders.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>
          
          {loading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Cargando...
              </span>
            </div>
          )}
          {error && (
            <div className={`text-sm px-3 py-1 rounded-md ${
              darkMode ? 'bg-red-900/20 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Cumplimiento Fechas Global"
          value={`${kpiData.globalCompliance.value}%`}
          change={kpiData.globalCompliance.change}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Desviación Fechas Desarrollo"
          value={`${kpiData.developmentComplianceDays.value}d`}
          change={kpiData.developmentComplianceDays.change}
          icon={Clock}
          color="yellow"
        />
        <MetricCard
          title="Calidad en Primera Entrega"
          value={`${kpiData.firstTimeQuality.value}%`}
          change={kpiData.firstTimeQuality.change}
          icon={CheckCircle}
          color={kpiData.firstTimeQuality.value >= 90 ? "green" : kpiData.firstTimeQuality.value >= 80 ? "yellow" : "red"}
        />
        <MetricCard
          title="Tiempo Respuesta a Fallas (h)"
          value={kpiData.failureResponseTime.value}
          change={kpiData.failureResponseTime.change}
          icon={AlertTriangle}
          color="blue"
        />
        <MetricCard
          title="Defectos por Entrega"
          value={kpiData.defectsPerDelivery.value}
          change={kpiData.defectsPerDelivery.change}
          icon={Bug}
          color="red"
        />
        <MetricCard
          title="Retrabajo Post-Producción"
          value={`${kpiData.postProductionRework.value}%`}
          change={kpiData.postProductionRework.change}
          icon={Repeat}
          color="yellow"
        />
        <MetricCard
          title="Tiempo Resolución Instaladores"
          value={`${kpiData.installerResolutionTime.value}h`}
          change={kpiData.installerResolutionTime.change}
          icon={Clock}
          color={kpiData.installerResolutionTime.value <= 24 ? "green" : kpiData.installerResolutionTime.value <= 48 ? "yellow" : "red"}
        />
      </div>
      
      {/* Charts */}
      <div className={`${
        darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
      } border rounded-xl p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${
          darkMode ? 'text-white' : 'text-neutral-900'
        }`}>
          <BarChart3 className="mr-2" size={20} />
          Calidad en Primera Entrega por Proveedor
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={providerQualityData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="name"
              tick={{ fill: darkMode ? '#a3a3a3' : '#525252' }}
            />
            <YAxis unit="%" tick={{ fill: darkMode ? '#a3a3a3' : '#525252' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: darkMode ? '#262626' : '#ffffff',
                border: darkMode ? '1px solid #404040' : '1px solid #e5e5e5',
                borderRadius: '8px',
                color: darkMode ? '#ffffff' : '#000000',
              }}
              cursor={{fill: darkMode ? 'rgba(156, 163, 175, 0.1)' : 'rgba(229, 231, 235, 0.5)'}}
            />
            <Bar dataKey="quality" name="Calidad %">
              {providerQualityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default Indicators;
