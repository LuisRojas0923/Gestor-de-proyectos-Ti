import {
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Title, Text } from '../components/atoms';
import { MetricCard } from '../components/molecules';
import { API_ENDPOINTS } from '../config/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';


interface AnalystPerformance {
  name: string;
  total: number;
  cerrados: number;
  avg_time: number;
  performance_score: number;
}


const Indicators: React.FC = () => {
  const { get } = useApi<any>();

  const [summary, setSummary] = useState({
    total: 0,
    pendientes: 0,
    cerrados: 0,
    escalados: 0,
    completion_rate: 0
  });
  const [analysts, setAnalysts] = useState<AnalystPerformance[]>([]);
  const [advancedStats, setAdvancedStats] = useState({
    avg_resolution_time: 0,
    sla_compliance: 0,
    total_resolved: 0,
    priority_distribution: {} as Record<string, number>,
    sla_limit_hours: 48
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [summaryData, performanceData, advancedData] = await Promise.all([
          get(API_ENDPOINTS.TICKET_STATS_SUMMARY),
          get(API_ENDPOINTS.TICKET_STATS_PERFORMANCE),
          get(API_ENDPOINTS.TICKET_STATS_ADVANCED)
        ]);
        if (summaryData) setSummary(summaryData);
        if (performanceData) setAnalysts(performanceData);
        if (advancedData) setAdvancedStats(advancedData);
      } catch (error) {
        console.error("Error cargando indicadores:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [get]);

  if (isLoading) return <div className="p-10 text-center">Cargando indicadores de gestión...</div>;

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div>
        <Title variant="h1" weight="bold" color="text-primary" className="mb-2">
          Indicadores de Gestión TI
        </Title>
        <Text variant="body1" color="text-secondary" weight="medium">Métricas de desempeño de analistas y estado de la cola de soporte</Text>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Actividades Pendientes"
          value={(summary?.pendientes || 0).toString()}
          change={{ value: 12, type: 'increase' }}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Tickets Resueltos"
          value={(summary?.cerrados || 0).toString()}
          change={{ value: 5, type: 'increase' }}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Tasa de Cierre"
          value={`${(summary?.completion_rate || 0).toFixed(1)}%`}
          change={{ value: 3, type: 'increase' }}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Tickets Escalados"
          value={(summary?.escalados || 0).toString()}
          change={{ value: 0, type: 'decrease' }}
          icon={AlertCircle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="SLA Compliance"
          value={`${advancedStats.sla_compliance}%`}
          change={{ value: 2, type: 'increase' }}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Prom. Resolución"
          value={`${advancedStats.avg_resolution_time}h`}
          change={{ value: 0.5, type: 'decrease' }}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Tickets Resueltos"
          value={advancedStats.total_resolved.toString()}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="SLA Goal"
          value={`< ${advancedStats.sla_limit_hours}h`}
          icon={Activity}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ranking de Analistas */}
        <div className="lg:col-span-2 bg-[var(--color-surface)] rounded-[2.5rem] p-8 shadow-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Activity className="text-[var(--color-primary)]" />
              <Title variant="h4" weight="bold" color="text-primary">Desempeño por Analista</Title>
            </div>
            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40">Efficiency Ranking</Text>
          </div>

          <div className="h-[300px] w-full">
            {isMounted && analysts.length > 0 && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                <BarChart data={analysts as any[]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 'bold' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '1.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}
                    cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }}
                  />
                  <Bar dataKey="performance_score" radius={[8, 8, 0, 0]} barSize={40}>
                    {analysts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--color-primary)' : 'var(--color-primary-light)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribución por Prioridad */}
        <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-8 shadow-xl border border-[var(--color-border)]">
          <Title variant="h4" weight="bold" color="text-primary" className="mb-6">Carga por Prioridad</Title>
          <div className="h-[250px] w-full relative">
            {isMounted && Object.keys(advancedStats.priority_distribution).length > 0 && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                <PieChart>
                  <Pie
                    data={Object.entries(advancedStats.priority_distribution).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.entries(advancedStats.priority_distribution).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['var(--color-error)', 'var(--color-warning)', 'var(--color-primary)', 'var(--color-success)'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '1.2rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <Text variant="h3" weight="bold" color="text-primary">{advancedStats.total_resolved.toString()}</Text>
              <Text variant="caption" weight="bold" color="text-secondary" className="uppercase opacity-40">Resolved</Text>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {Object.entries(advancedStats.priority_distribution).map(([name, value], i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${i % 4 === 0 ? 'bg-[var(--color-error)]' :
                    i % 4 === 1 ? 'bg-[var(--color-warning)]' :
                      i % 4 === 2 ? 'bg-[var(--color-primary)]' :
                        'bg-[var(--color-success)]'
                    }`}></div>
                  <Text variant="body2" weight="bold" color="text-secondary">{name}</Text>
                </div>
                <Text variant="body2" weight="bold" color="text-secondary" className="opacity-60 font-mono">{value}</Text>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Listado Detallado (Tabla Premium) */}
      <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-6 shadow-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)]/50">
                <th className="px-6 py-4 text-xs font-black text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Analista</th>
                <th className="px-6 py-4 text-xs font-black text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Asignados</th>
                <th className="px-6 py-4 text-xs font-black text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Resueltos</th>
                <th className="px-6 py-4 text-xs font-black text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Eficiencia (%)</th>
                <th className="px-6 py-4 text-xs font-black text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Prom. Atención</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/30">
              {analysts.map((analyst, i) => (
                <tr key={i} className="hover:bg-[var(--color-surface-variant)]/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center font-black shadow-md shadow-[var(--color-primary)]/20">
                        {analyst.name[0]}
                      </div>
                      <Text weight="bold" color="text-primary">{analyst.name}</Text>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-mono font-bold text-[var(--color-text-secondary)]">{analyst.total}</td>
                  <td className="px-6 py-5 font-mono font-bold text-[var(--color-text-secondary)]">{analyst.cerrados}</td>
                  <td className="px-6 py-5">
                    {(() => {
                      const barWidthStyle = { width: `${analyst.performance_score}%` };
                      return (
                        <div className="flex items-center space-x-3">
                          <div className="flex-grow bg-[var(--color-surface-variant)] h-2 rounded-full overflow-hidden max-w-[80px]">
                            <div className="bg-[var(--color-primary)] h-full rounded-full" style={barWidthStyle}></div>
                          </div>
                          <Text variant="caption" weight="bold" color="text-primary">{analyst.performance_score.toFixed(0)}%</Text>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-5">
                    <Text variant="caption" weight="bold" className="px-4 py-1.5 bg-[var(--color-surface-variant)] rounded-full text-[var(--color-text-secondary)] border border-[var(--color-border)]/50">
                      {analyst.avg_time.toFixed(1)}h
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Indicators;
