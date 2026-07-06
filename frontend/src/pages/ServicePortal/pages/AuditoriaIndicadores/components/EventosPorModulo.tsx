import React from 'react';
import { MaterialCard as Card, Title, Text } from '../../../../../components/atoms';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { StatsPorModulo } from '../../../../../types/auditoria';

interface EventosPorModuloProps {
  datos: StatsPorModulo[];
}

// Paleta corporativa armónica (Cool tones: Blues, Teals, Indigos, Slates)
const CORPORATE_PALETTE = [
  'var(--color-primary)', // Deep Navy (Base de la marca)
  '#3b82f6', // Blue 500
  '#14b8a6', // Teal 500
  '#6366f1', // Indigo 500
  '#0ea5e9', // Sky 500
  '#8b5cf6', // Violet 500
  '#64748b', // Slate 500
  '#06b6d4', // Cyan 500
  '#4f46e5', // Indigo 600
  '#0f766e', // Teal 700
];


const EventosPorModulo: React.FC<EventosPorModuloProps> = ({ datos }) => {
  // Tomamos solo los top 10 módulos para no saturar la gráfica
  const chartData = datos.slice(0, 10);

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
      <div className="mb-4">
        <Title variant="h6">Eventos por Módulo</Title>
        <Text variant="caption" color="text-secondary">Top 10 módulos con más actividad</Text>
      </div>
      <div className="w-full h-[280px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <Text variant="body2" color="text-secondary">No hay datos para este período.</Text>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
            <XAxis type="number" stroke="var(--color-text-secondary)" fontSize={12} />
            <YAxis 
              dataKey="modulo" 
              type="category" 
              stroke="var(--color-text-secondary)" 
              fontSize={12} 
              width={100}
              tickFormatter={(val) => val.length > 15 ? `${val.substring(0, 15)}...` : val}
            />
            <Tooltip 
              cursor={{ fill: 'var(--color-surface-variant)', opacity: 0.4 }}
              contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              itemStyle={{ color: 'var(--color-text-primary)' }}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CORPORATE_PALETTE[index % CORPORATE_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default EventosPorModulo;
