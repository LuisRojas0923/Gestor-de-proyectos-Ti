import React from 'react';
import { MaterialCard as Card, Title, Text } from '../../../../../components/atoms';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Clock } from 'lucide-react';

interface StatsPorHora {
  rango: string;
  total: number;
}

interface DistribucionHorariosProps {
  datos: StatsPorHora[];
}

const COLORS = [
  'var(--color-primary)', // Horario Laboral (Deep Navy)
  '#f59e0b', // Tarde / Noche (Amber)
  '#6366f1', // Madrugada (Indigo)
];

export const DistribucionHorarios: React.FC<DistribucionHorariosProps> = ({ datos }) => {
  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
      <div className="mb-4">
        <Title variant="h6" className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--color-primary)]" />
          Distribución de Horarios
        </Title>
        <Text variant="caption" color="text-secondary">Uso del sistema por franjas horarias</Text>
      </div>
      <div className="w-full h-[200px]">
        {!datos || datos.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <Text variant="body2" color="text-secondary">No hay datos de horario.</Text>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={datos} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
              <XAxis type="number" stroke="var(--color-text-secondary)" fontSize={12} />
              <YAxis
                dataKey="rango"
                type="category"
                stroke="var(--color-text-secondary)"
                fontSize={12}
                width={160}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-variant)', opacity: 0.4 }}
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                {datos.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
