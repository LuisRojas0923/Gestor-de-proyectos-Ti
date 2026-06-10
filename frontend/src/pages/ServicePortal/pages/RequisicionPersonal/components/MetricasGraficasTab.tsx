import React, { useMemo } from 'react';
import { Building2, MapPin, Briefcase, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Text, Title } from '../../../../../components/atoms';
import { ConsolidadoRPItem } from '../services/requisicionService';

interface MetricasGraficasTabProps {
  consolidado: ConsolidadoRPItem[];
}

const COLORES_ESTADO: Record<string, string> = {
  CONTRATADO: '#10b981', // emerald-500
  APLICA: '#6366f1',     // indigo-500
  NO_APLICA: '#f43f5e',  // rose-500
  POR_EVALUAR: '#f59e0b',// amber-500
  DEFAULT: '#94a3b8'     // slate-400
};

export const MetricasGraficasTab: React.FC<MetricasGraficasTabProps> = ({ consolidado }) => {
  // 1. Área
  const datosArea = useMemo(() => {
    const counts: Record<string, number> = {};
    consolidado.forEach(c => {
      const area = c.area || 'Sin Área';
      counts[area] = (counts[area] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8
  }, [consolidado]);

  // 2. Ciudad
  const datosCiudad = useMemo(() => {
    const counts: Record<string, number> = {};
    consolidado.forEach(c => {
      const ciudad = c.ciudad || 'Sin Ciudad';
      counts[ciudad] = (counts[ciudad] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8
  }, [consolidado]);

  // 3. Temporal
  const datosTemporal = useMemo(() => {
    const counts: Record<string, number> = {};
    consolidado.forEach(c => {
      const temp = c.empresa_temporal || 'Directo / Sin Temporal';
      counts[temp] = (counts[temp] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [consolidado]);

  // 4. Estado
  const datosEstado = useMemo(() => {
    const counts: Record<string, number> = {};
    consolidado.forEach(c => {
      const estado = c.estado_candidato || 'POR_EVALUAR';
      counts[estado] = (counts[estado] || 0) + 1;
    });
    const labels: Record<string, string> = {
      CONTRATADO: 'Contratado',
      APLICA: 'Aplica',
      NO_APLICA: 'No Aplica',
      POR_EVALUAR: 'Por Evaluar',
    };
    return Object.entries(counts).map(([key, value]) => ({
      name: labels[key] || key,
      key,
      value
    }));
  }, [consolidado]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-300">
      
      {/* ── Chart 1: Áreas más solicitadas ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <Title variant="h5" weight="bold" className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Áreas más solicitadas
            </Title>
            <Text variant="caption" color="text-secondary">Distribución de candidatos por área solicitante</Text>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosArea} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-700/50" />
              <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={80} />
              <Tooltip 
                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} 
                contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" name="Candidatos" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart 2: Estados del Proceso ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Activity className="w-4.5 h-4.5" />
          </div>
          <div>
            <Title variant="h5" weight="bold" className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Estado de los Candidatos
            </Title>
            <Text variant="caption" color="text-secondary">Comparativa de fases en el proceso de selección</Text>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-between gap-4">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosEstado}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {datosEstado.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORES_ESTADO[entry.key] || COLORES_ESTADO.DEFAULT} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-2">
            {datosEstado.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-slate-800 pb-1 last:border-0">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: COLORES_ESTADO[entry.key] || COLORES_ESTADO.DEFAULT }} 
                  />
                  <Text size="xs" weight="medium" className="text-slate-600 dark:text-slate-300">{entry.name}</Text>
                </div>
                <Text size="xs" weight="bold" className="text-slate-700 dark:text-slate-200">{entry.value}</Text>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart 3: Distribución Geográfica ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <MapPin className="w-4.5 h-4.5" />
          </div>
          <div>
            <Title variant="h5" weight="bold" className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Distribución por Ciudad
            </Title>
            <Text variant="caption" color="text-secondary">Sedes principales de contratación</Text>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosCiudad} margin={{ left: 0, right: 0, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700/50" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(20, 184, 166, 0.05)' }}
                contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" name="Candidatos" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart 4: Hojas de Vida por Temporal ─────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Briefcase className="w-4.5 h-4.5" />
          </div>
          <div>
            <Title variant="h5" weight="bold" className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Hojas de Vida por Temporales
            </Title>
            <Text variant="caption" color="text-secondary">Comparativo del flujo de candidatos por proveedor</Text>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosTemporal} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-700/50" />
              <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={80} />
              <Tooltip 
                cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }}
                contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" name="Candidatos" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
