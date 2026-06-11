import React, { useMemo, useState } from 'react';
import { Building2, MapPin, Briefcase, Activity, TrendingUp, UserCheck, UserX } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Text, Title, Select, MaterialCard } from '../../../../../components/atoms';
import { ConsolidadoRPItem } from '../services/requisicionService';

interface MetricasAnalisisTabProps {
  consolidado: ConsolidadoRPItem[];
}

const COLORES_ESTADO: Record<string, string> = {
  CONTRATADO: '#10b981', // emerald-500
  APLICA: '#6366f1',     // indigo-500
  NO_APLICA: '#f43f5e',  // rose-500
  POR_EVALUAR: '#f59e0b',// amber-500
  DEFAULT: '#94a3b8'     // slate-400
};

export const MetricasAnalisisTab: React.FC<MetricasAnalisisTabProps> = ({ consolidado }) => {
  const [selectedTemporal, setSelectedTemporal] = useState<string>('TODAS');

  // Obtener lista única de temporales
  const listaTemporales = useMemo(() => {
    const temporales = new Set<string>();
    consolidado.forEach(c => {
      if (c.empresa_temporal) {
        temporales.add(c.empresa_temporal);
      }
    });
    return Array.from(temporales).sort();
  }, [consolidado]);

  // Filtrar consolidado según la temporal seleccionada
  const datosFiltrados = useMemo(() => {
    if (selectedTemporal === 'TODAS') return consolidado;
    return consolidado.filter(c => c.empresa_temporal === selectedTemporal);
  }, [consolidado, selectedTemporal]);

  // KPIs
  const totalHojasVida = datosFiltrados.length;
  
  const contratados = useMemo(() => {
    return datosFiltrados.filter(c => c.estado_candidato === 'CONTRATADO').length;
  }, [datosFiltrados]);

  const descartados = useMemo(() => {
    return datosFiltrados.filter(c => c.estado_candidato === 'NO_APLICA').length;
  }, [datosFiltrados]);

  const tasaContratacion = totalHojasVida > 0 ? Math.round((contratados / totalHojasVida) * 100) : 0;
  const tasaDescarte = totalHojasVida > 0 ? Math.round((descartados / totalHojasVida) * 100) : 0;

  // 1. Área
  const datosArea = useMemo(() => {
    const counts: Record<string, number> = {};
    datosFiltrados.forEach(c => {
      const area = c.area || 'Sin Área';
      counts[area] = (counts[area] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8
  }, [datosFiltrados]);

  // 2. Ciudad
  const datosCiudad = useMemo(() => {
    const counts: Record<string, number> = {};
    datosFiltrados.forEach(c => {
      const city = c.ciudad || 'Sin Ciudad';
      counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8
  }, [datosFiltrados]);

  // 3. Temporal (para vista global)
  const datosTemporal = useMemo(() => {
    const counts: Record<string, number> = {};
    datosFiltrados.forEach(c => {
      const temp = c.empresa_temporal || 'Directo / Sin Temporal';
      counts[temp] = (counts[temp] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [datosFiltrados]);

  // 4. Motivos de Descarte (para vista específica)
  const datosDescarte = useMemo(() => {
    const counts: Record<string, number> = {};
    datosFiltrados.forEach(c => {
      if (c.estado_candidato === 'NO_APLICA') {
        const motivo = c.causal_descarte || 'No especificado';
        counts[motivo] = (counts[motivo] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6
  }, [datosFiltrados]);

  // 5. Estado
  const datosEstado = useMemo(() => {
    const counts: Record<string, number> = {};
    datosFiltrados.forEach(c => {
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
  }, [datosFiltrados]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ── Toolbar / Selector de Temporal ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <Title variant="h5" weight="bold" className="text-slate-800 dark:text-slate-100">
            Filtro de Rendimiento
          </Title>
          <Text variant="caption" color="text-secondary">
            Selecciona una temporal específica para evaluar su embudo de contratación y efectividad.
          </Text>
        </div>
        <div className="w-full sm:w-[280px]">
          <Select
            value={selectedTemporal}
            onChange={(e) => setSelectedTemporal(e.target.value)}
            size="xs"
            className="font-medium"
          >
            <option value="TODAS">Todas las temporales</option>
            {listaTemporales.map(temp => (
              <option key={temp} value={temp}>{temp}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* ── Tarjetas de KPIs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MaterialCard elevation={1} className="p-4 flex items-center justify-between border border-slate-50 dark:border-slate-800/80">
          <div className="space-y-1">
            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider !text-[10px]">
              Postulaciones Recibidas
            </Text>
            <Title variant="h3" weight="bold" className="text-slate-800 dark:text-slate-100">
              {totalHojasVida}
            </Title>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </MaterialCard>

        <MaterialCard elevation={1} className="p-4 flex items-center justify-between border border-slate-50 dark:border-slate-800/80">
          <div className="space-y-1">
            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider !text-[10px]">
              Tasa de Contratación
            </Text>
            <div className="flex items-baseline gap-2">
              <Title variant="h3" weight="bold" className="text-slate-800 dark:text-slate-100">
                {tasaContratacion}%
              </Title>
              <Text size="xs" color="text-secondary" className="font-semibold">
                ({contratados} contr.)
              </Text>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </MaterialCard>

        <MaterialCard elevation={1} className="p-4 flex items-center justify-between border border-slate-50 dark:border-slate-800/80">
          <div className="space-y-1">
            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wider !text-[10px]">
              Tasa de Descarte
            </Text>
            <div className="flex items-baseline gap-2">
              <Title variant="h3" weight="bold" className="text-slate-800 dark:text-slate-100">
                {tasaDescarte}%
              </Title>
              <Text size="xs" color="text-secondary" className="font-semibold">
                ({descartados} desc.)
              </Text>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <UserX className="w-5 h-5" />
          </div>
        </MaterialCard>
      </div>

      {/* ── Gráficos de Métricas ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Chart 1: Áreas más solicitadas */}
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

        {/* Chart 2: Estados del Proceso */}
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
            {datosEstado.length === 0 ? (
              <div className="w-full text-center py-10">
                <Text size="xs" color="text-secondary">Sin datos disponibles</Text>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Chart 3: Distribución Geográfica */}
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

        {/* Chart 4: Condicional (Hojas de Vida por Temporal vs Motivos de Descarte) */}
        {selectedTemporal === 'TODAS' ? (
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
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <UserX className="w-4.5 h-4.5" />
              </div>
              <div>
                <Title variant="h5" weight="bold" className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Motivos de Descarte
                </Title>
                <Text variant="caption" color="text-secondary">Causales más frecuentes de rechazo para esta temporal</Text>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {datosDescarte.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-xs">
                  Ningún candidato ha sido descartado para esta temporal
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosDescarte} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-700/50" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={100} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(244, 63, 94, 0.05)' }}
                      contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" name="Candidatos" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
