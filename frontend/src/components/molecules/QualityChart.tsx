import React from 'react';
import { BarChart3 } from 'lucide-react';
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
import { MaterialCard } from '../atoms';
import { ProviderQualityData } from '../../hooks/useKpiData';

interface QualityChartProps {
  data: ProviderQualityData[];
  darkMode: boolean;
}

const QualityChart: React.FC<QualityChartProps> = ({ data, darkMode }) => {
  return (
    <MaterialCard 
      darkMode={darkMode}
      elevation={1}
      className="p-6"
    >
      <MaterialCard.Header darkMode={darkMode}>
        <h3 className={`text-lg font-semibold flex items-center ${
          darkMode ? 'text-white' : 'text-neutral-900'
        }`}>
          <BarChart3 className="mr-2" size={20} />
          Calidad en Primera Entrega por Proveedor
        </h3>
      </MaterialCard.Header>

      <MaterialCard.Content darkMode={darkMode} className="pt-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MaterialCard.Content>
    </MaterialCard>
  );
};

export default QualityChart;
