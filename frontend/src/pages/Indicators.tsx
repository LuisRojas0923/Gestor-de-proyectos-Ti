import { AlertTriangle, Bug, CheckCircle, Clock, Repeat, TrendingUp, Bug as DebugIcon } from 'lucide-react';
import React, { useState } from 'react';
import { MetricCard, IndicatorsHeader, QualityChart } from '../components/molecules';
import { MaterialButton } from '../components/atoms';
import { useAppContext } from '../context/AppContext';
import { useKpiData, useProviders, useKpiDebug } from '../hooks/useKpiData';


const Indicators: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;
  
  // Estado local para el proveedor seleccionado
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  
  // Hooks personalizados para manejar datos
  const { kpiData, providerQualityData, loading, error } = useKpiData(selectedProvider);
  const { availableProviders } = useProviders();
  const { debugKpiCalculations } = useKpiDebug();

  // Función para manejar el cambio de proveedor
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
  };

  // Función para debug
  const handleDebug = async () => {
    console.log('🐛 Iniciando debug de KPIs...');
    await debugKpiCalculations(selectedProvider === 'all' ? undefined : selectedProvider);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <IndicatorsHeader
          darkMode={darkMode}
          selectedProvider={selectedProvider}
          availableProviders={availableProviders}
          loading={loading}
          error={error}
          onProviderChange={handleProviderChange}
        />
        
        {/* Botón de debug temporal */}
        <div className="flex justify-end">
          <MaterialButton
            variant="outlined"
            onClick={handleDebug}
            darkMode={darkMode}
            className="text-xs"
          >
            <DebugIcon size={16} className="mr-1" />
            Debug KPIs
          </MaterialButton>
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
      
      {/* Gráfico de Calidad por Proveedor */}
      <QualityChart data={providerQualityData} darkMode={darkMode} />

    </div>
  );
};

export default Indicators;
