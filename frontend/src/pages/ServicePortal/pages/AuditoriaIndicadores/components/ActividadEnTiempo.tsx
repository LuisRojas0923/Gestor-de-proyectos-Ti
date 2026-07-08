import React, { useMemo } from 'react';
import { MaterialCard as Card, Title, Text } from '../../../../../components/atoms';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import type { StatsPorDia } from '../../../../../types/auditoria';

interface ActividadEnTiempoProps {
  datos: StatsPorDia[];
}

// Formateador inmune al desfase UTC de new Date("YYYY-MM-DD")
const formatearFechaAmigable = (fechaStr: string, opciones: Intl.DateTimeFormatOptions): string => {
  const esPorHora = fechaStr.includes(' ') || fechaStr.includes('T');
  if (!esPorHora) {
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
      const ano = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10) - 1; // 0-indexed en JS
      const dia = parseInt(partes[2], 10);
      const date = new Date(ano, mes, dia);
      return date.toLocaleDateString('es-CO', opciones);
    }
  } else {
    const parseable = fechaStr.replace(' ', 'T');
    const date = new Date(parseable);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-CO', opciones);
    }
  }
  return fechaStr;
};

const obtenerEtiquetaFecha = (fechaStr: string): string => {
  const esPorHora = fechaStr.includes(' ') || fechaStr.includes('T');
  if (!esPorHora) {
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
      const ano = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10) - 1;
      const dia = parseInt(partes[2], 10);
      const date = new Date(ano, mes, dia);
      return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    }
  } else {
    const parseable = fechaStr.replace(' ', 'T');
    const date = new Date(parseable);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
  }
  return fechaStr;
};

const ActividadEnTiempo: React.FC<ActividadEnTiempoProps> = ({ datos }) => {
  const formattedData = datos.map(d => {
    return {
      ...d,
      fechaFormateada: obtenerEtiquetaFecha(d.fecha)
    };
  });

  const metricas = useMemo(() => {
    if (!datos || datos.length === 0) return null;

    const total = datos.reduce((acc, curr) => acc + curr.total, 0);
    const promedio = total / datos.length;

    // Día con mayor actividad
    let maxDia = datos[0];
    datos.forEach(d => {
      if (d.total > maxDia.total) {
        maxDia = d;
      }
    });

    // Formatear la fecha del día máximo de forma amigable sin desfase
    const maxDiaFormateado = formatearFechaAmigable(maxDia.fecha, { day: 'numeric', month: 'long' });

    // Detectar concentración inusual (70% o más en los 2 días principales cuando hay > 3 días)
    const ordenados = [...datos].sort((a, b) => b.total - a.total);
    const top2Suma = (ordenados[0]?.total || 0) + (ordenados[1]?.total || 0);
    const porcentajeTop2 = total > 0 ? (top2Suma / total) * 100 : 0;

    let alertaConcentracion = null;
    if (datos.length > 3 && porcentajeTop2 >= 70 && total > 5) {
      const f1Str = formatearFechaAmigable(ordenados[0].fecha, { day: 'numeric', month: 'short' });
      const f2Str = ordenados[1] ? formatearFechaAmigable(ordenados[1].fecha, { day: 'numeric', month: 'short' }) : '';
      
      const fechasTexto = f2Str ? `${f1Str} y ${f2Str}` : f1Str;
      
      alertaConcentracion = {
        titulo: 'Concentración inusual de actividad',
        mensaje: `El ${Math.round(porcentajeTop2)}% de los eventos del período se concentraron el ${fechasTexto}.`
      };
    }

    return {
      total,
      promedio,
      maxDiaFormateado,
      maxDiaValor: maxDia.total,
      alerta: alertaConcentracion
    };
  }, [datos]);

  return (
    <Card className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm lg:col-span-2 flex flex-col justify-between">
      <div>
        <div className="mb-4">
          <Title variant="h6">Actividad en el Tiempo</Title>
          <Text variant="caption" color="text-secondary">Volumen de eventos por día en el período seleccionado</Text>
        </div>

        {/* Alerta de concentración inusual si se detecta */}
        {metricas?.alerta && (
          <div className="mb-4 p-3 bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/50 dark:border-amber-900/30 rounded-xl flex items-start gap-2.5 text-amber-950 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <Text as="span" color="inherit" className="font-bold text-xs uppercase tracking-wider block mb-0.5">{metricas.alerta.titulo}</Text>
              <Text variant="body2" color="inherit" className="font-medium">
                {metricas.alerta.mensaje}
              </Text>
            </div>
          </div>
        )}

        {/* Mini KPIs */}
        {metricas && (
          <div className="grid grid-cols-3 gap-4 mb-5 border-b border-[var(--color-border)] pb-4">
            <div className="flex flex-col">
              <Text as="span" color="inherit" className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-secondary)]">Total Eventos</Text>
              <Text as="span" color="inherit" className="text-base font-extrabold text-[var(--color-text-primary)] mt-0.5">{metricas.total.toLocaleString()}</Text>
            </div>
            <div className="flex flex-col border-l border-[var(--color-border)] pl-4">
              <Text as="span" color="inherit" className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-secondary)]">Promedio Diario</Text>
              <Text as="span" color="inherit" className="text-base font-extrabold text-[var(--color-text-primary)] mt-0.5">{Math.round(metricas.promedio).toLocaleString()}</Text>
            </div>
            <div className="flex flex-col border-l border-[var(--color-border)] pl-4">
              <Text as="span" color="inherit" className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-secondary)]">Pico Máximo</Text>
              <Text as="span" color="inherit" className="text-xs font-semibold text-[var(--color-text-primary)] truncate mt-1" title={`${metricas.maxDiaValor} eventos el ${metricas.maxDiaFormateado}`}>
                {metricas.maxDiaFormateado} ({metricas.maxDiaValor})
              </Text>
            </div>
          </div>
        )}
      </div>

      <div className="w-full h-[240px]">
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
