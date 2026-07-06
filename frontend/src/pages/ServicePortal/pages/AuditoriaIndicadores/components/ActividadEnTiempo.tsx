import React from 'react';
import { MaterialCard as Card, Title, Text } from '../../../../../components/atoms';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { StatsPorDia } from '../../../../../types/auditoria';

interface ActividadEnTiempoProps {
  datos: StatsPorDia[];
}

const ActividadEnTiempo: React.FC<ActividadEnTiempoProps> = ({ datos }) => {
  const formattedData = datos.map(d => {
    // Si la fecha incluye espacio o T, asumimos que viene con hora (ej: "2026-07-03 14:00")
    const esPorHora = d.fecha.includes(' ') || d.fecha.includes('T');
    const parseableDateStr = d.fecha.replace(' ', 'T');
    const date = new Date(parseableDateStr);
    
    let dateStr = d.fecha;
    if (!isNaN(date.getTime())) {
      if (esPorHora) {
        dateStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      } else {
        dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
      }
    }
      
    return {
      ...d,
      fechaFormateada: dateStr
    };
  });

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm lg:col-span-2">
      <div className="mb-4">
        <Title variant="h6">Actividad en el Tiempo</Title>
        <Text variant="caption" color="text-secondary">Volumen de eventos por día en el período seleccionado</Text>
      </div>
      <div className="w-full h-[280px]">
        {formattedData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <Text variant="body2" color="text-secondary">No hay datos para este período.</Text>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
            <XAxis 
              dataKey="fechaFormateada" 
              stroke="var(--color-text-secondary)" 
              fontSize={12} 
              tickMargin={10} 
            />
            <YAxis 
              stroke="var(--color-text-secondary)" 
              fontSize={12} 
              tickFormatter={(val) => val.toLocaleString()}
            />
            <Tooltip 
              cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '3 3' }}
              contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              labelStyle={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}
              itemStyle={{ color: 'var(--color-text-primary)' }}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              name="Eventos"
              stroke="var(--color-primary)" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: 'var(--color-surface)' }}
              activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary)' }}
            />
          </LineChart>
        </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default ActividadEnTiempo;
