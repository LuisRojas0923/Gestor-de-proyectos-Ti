import React from 'react';
import { MaterialCard as Card, Title, Text } from '../../../../../components/atoms';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Laptop } from 'lucide-react';

interface StatsPorDispositivo {
  dispositivo: string;
  total: number;
}

interface OrigenDispositivoProps {
  datos: StatsPorDispositivo[];
}

const COLORS = [
  'var(--color-primary)', // Escritorio (Deep Navy)
  '#10b981', // Móvil (Green 500)
  '#6b7280', // API / Script (Gray 500)
];

export const OrigenDispositivo: React.FC<OrigenDispositivoProps> = ({ datos }) => {
  const chartData = React.useMemo(() => {
    if (!datos) return [];
    return datos.filter(item => item.total > 0);
  }, [datos]);

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
      <div className="mb-4">
        <Title variant="h6" className="flex items-center gap-2">
          <Laptop className="w-5 h-5 text-[var(--color-primary)]" />
          Origen por Dispositivo
        </Title>
        <Text variant="caption" color="text-secondary">Dispositivos desde donde se accede</Text>
      </div>
      <div className="w-full h-[200px] flex items-center justify-center">
        {chartData.length === 0 ? (
          <Text variant="body2" color="text-secondary">No hay datos de dispositivos.</Text>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="total"
                nameKey="dispositivo"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => <Text as="span" className="text-[var(--color-text-primary)] text-xs font-medium">{value}</Text>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
