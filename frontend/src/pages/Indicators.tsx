import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import MetricCard from '../components/common/MetricCard';
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Bug, Repeat, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';


// Sample data for the indicators
const kpiData = {
  globalCompliance: { value: 92, change: { value: 2, type: 'increase' } },
  developmentComplianceDays: { value: -1.5, change: { value: 0.5, type: 'decrease' } },
  firstTimeQuality: { value: 85, change: { value: 5, type: 'decrease' } },
  failureResponseTime: { value: 4.2, change: { value: -1.2, type: 'decrease' } },
  defectsPerDelivery: { value: 1.2, change: { value: 0.1, type: 'increase' } },
  postProductionRework: { value: 3, change: { value: -1, type: 'decrease' } },
};

const providerQualityData = [
    { name: 'Ingesoft', quality: 95, color: '#10B981' },
    { name: 'TI Interno', quality: 88, color: '#0066A5' },
    { name: 'ORACLE', quality: 72, color: '#EF4444' },
    { name: 'ITC', quality: 91, color: '#10B981' },
];


const Indicators: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { darkMode } = state;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Indicadores de Gestión (KPIs)
        </h1>
        {/* We can add date filters here later */}
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
