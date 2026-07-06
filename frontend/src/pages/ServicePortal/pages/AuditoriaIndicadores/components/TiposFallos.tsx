import React from 'react';
import { MaterialCard as Card, Title, Text } from '../../../../../components/atoms';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { TipoFallo } from '../../../../../types/auditoria';

interface TiposFallosProps {
  datos: TipoFallo[];
}

// Colores según el tipo de fallo
const getFalloColor = (tipo: string) => {
  const res = tipo.toLowerCase();
  if (res === 'autenticación') return '#0f766e'; // Teal 700
  if (res === 'permiso') return '#0891b2'; // Cyan 600
  if (res === 'validación') return '#0284c7'; // Sky 600
  if (res === 'sistema') return '#4f46e5'; // Indigo 600
  if (res === 'negocio') return '#7c3aed'; // Violet 600
  return 'var(--color-border)'; // Default
};

const TiposFallos: React.FC<TiposFallosProps> = ({ datos }) => {
  // Asegurarnos de que no hay datos vacíos y que no metemos éxitos aquí
  const chartData = datos.filter(d => d.total > 0);

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
      <div className="mb-4">
        <Title variant="h6">Fallos por Tipo</Title>
        <Text variant="caption" color="text-secondary">Distribución de eventos fallidos y denegados</Text>
      </div>
      <div className="w-full h-[280px]">
        {chartData.length === 0 ? (
           <div className="w-full h-full flex items-center justify-center">
             <Text variant="body2" color="text-secondary">No hay fallos para este período.</Text>
           </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
              <XAxis type="number" stroke="var(--color-text-secondary)" fontSize={12} />
              <YAxis 
                dataKey="tipo" 
                type="category" 
                stroke="var(--color-text-secondary)" 
                fontSize={12} 
                width={100}
                tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
              />
              <Tooltip 
                cursor={{ fill: 'var(--color-surface-variant)', opacity: 0.4 }}
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                itemStyle={{ textTransform: 'capitalize', color: 'var(--color-text-primary)' }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getFalloColor(entry.tipo)} />
                ))}
              </Bar>
            </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default TiposFallos;
