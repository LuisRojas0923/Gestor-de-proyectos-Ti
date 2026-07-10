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
  // Paleta de tonos fríos (azules, morados, índigos y un rosa suave) que combinan perfecto con el "deep navy"
  if (res === 'autenticación') return '#6366f1'; // Indigo 500
  if (res === 'permiso') return '#e11d48'; // Rose 600 (Rojo/Rosa oscuro que combina con azul)
  if (res === 'validación') return '#0ea5e9'; // Sky 500
  if (res === 'sistema') return '#3b82f6'; // Blue 500
  if (res === 'negocio') return '#8b5cf6'; // Violet 500
  return 'var(--color-primary-light, #93aed9)';
};

// Tooltip personalizado para mostrar la especificación detallada de los fallos
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TipoFallo }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const detalles = data.detalles || {};
    const keys = Object.keys(detalles);
    
    return (
      <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg max-w-[280px]">
        <Text as="p" color="inherit" className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">{data.tipo}</Text>
        <Text as="p" color="inherit" className="text-xs text-[var(--color-text-secondary)] mb-2">
          Total fallos: <Text as="span" color="inherit" className="font-semibold text-[var(--color-text-primary)]">{data.total}</Text>
        </Text>
        
        {keys.length > 0 ? (
          <div className="border-t border-[var(--color-border)] pt-2 space-y-1.5">
            <Text as="p" color="inherit" className="text-[9px] font-bold text-[var(--color-primary)] uppercase tracking-wider mb-1">
              Especificación del fallo:
            </Text>
            {keys.map((key) => (
              <div key={key} className="flex justify-between items-start gap-3 text-xs">
                <Text as="span" color="inherit" className="text-[var(--color-text-secondary)] leading-tight text-[11px]">{key}</Text>
                <Text as="span" color="inherit" className="font-semibold text-[var(--color-text-primary)] flex-shrink-0 bg-[var(--color-surface-variant)] px-1.5 py-0.5 rounded text-[10px]">
                  {detalles[key]}
                </Text>
              </div>
            ))}
          </div>
        ) : (
          <Text as="p" color="inherit" className="text-[10px] text-[var(--color-text-secondary)] italic">Sin desglose disponible</Text>
        )}
      </div>
    );
  }
  return null;
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
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
              <XAxis type="number" stroke="var(--color-text-secondary)" fontSize={12} allowDecimals={false} />
              <YAxis 
                dataKey="tipo" 
                type="category" 
                stroke="var(--color-text-secondary)" 
                fontSize={12} 
                width={100}
                tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
              />
              <Tooltip content={<CustomTooltip />} />
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
