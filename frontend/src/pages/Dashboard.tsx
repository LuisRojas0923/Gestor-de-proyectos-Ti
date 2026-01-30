import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  LifeBuoy,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Title, Text, Icon } from '../components/atoms';
import { AlertPanel } from '../components/alerts';
import { MetricCard } from '../components/molecules';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';

interface DashboardMetrics {
  total_desarrollos: number;
  desarrollos_activos: number;
  total_tickets: number;
  tickets_pendientes: number;
  porcentaje_completado: number;
  desarrollos_completados: number;
}

interface AnalystPerformanceData {
  name: string;
  total: number;
  cerrados: number;
  en_proceso: number;
  avg_time: number;
  performance_score: number;
}

interface PriorityData {
  prioridad: string;
  cantidad: number;
  color: string;
}

const formatAnalystName = (name: string) => {
  if (!name) return "";
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-[1.5rem] shadow-2xl backdrop-blur-md">
        <Text variant="body2" weight="bold" color="text-primary" className="mb-3 block border-b border-[var(--color-border)] pb-2">
          {formatAnalystName(data.name)}
        </Text>
        <div className="space-y-2">
          <div className="flex justify-between gap-6">
            <Text variant="caption" color="text-secondary" weight="medium">Tickets Asignados:</Text>
            <Text variant="caption" weight="bold" className="text-[var(--color-primary)]">{data.total}</Text>
          </div>
          <div className="flex justify-between gap-6">
            <Text variant="caption" color="text-secondary" weight="medium">En Proceso:</Text>
            <Text variant="caption" weight="bold" className="text-blue-500">{data.en_proceso}</Text>
          </div>
          <div className="flex justify-between gap-6">
            <Text variant="caption" color="text-secondary" weight="medium">Tickets Cerrados:</Text>
            <Text variant="caption" weight="bold" color="text-primary">{data.cerrados}</Text>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex justify-between gap-6">
            <Text variant="caption" weight="bold" color="text-primary">Promedio Atención:</Text>
            <Text variant="caption" weight="bold" className="text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 rounded-md">
              {data.avg_time}h
            </Text>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { get, post } = useApi<any>();
  const navigate = useNavigate();

  // Load metrics from API
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_desarrollos: 0,
    desarrollos_activos: 0,
    total_tickets: 0,
    tickets_pendientes: 0,
    porcentaje_completado: 0,
    desarrollos_completados: 0
  });

  const [analystData, setAnalystData] = useState<AnalystPerformanceData[]>([]);
  const [priorityData, setPriorityData] = useState<PriorityData[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Retraso controlado para permitir que el motor de layout del navegador
    // termine antes de que Recharts intente medir el contenedor.
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Load dashboard data
    const loadDashboardData = async () => {
      try {
        // Load metrics
        const metricsData = await get(API_ENDPOINTS.DASHBOARD_METRICS) as DashboardMetrics | null;
        if (metricsData) {
          setMetrics(metricsData);
        }

        // Load analyst performance (Operational Load)
        const analystResponse = await get(API_ENDPOINTS.TICKET_STATS_PERFORMANCE) as AnalystPerformanceData[] | null;
        if (analystResponse) {
          // Formatear nombres al cargar
          const formattedData = analystResponse.map(a => ({
            ...a,
            displayName: formatAnalystName(a.name)
          }));
          setAnalystData(formattedData);
        }

        // Load priority distribution
        const priorityDataResponse = await get(API_ENDPOINTS.DASHBOARD_PRIORITY_DISTRIBUTION) as PriorityData[] | null;
        if (priorityDataResponse) {
          setPriorityData(priorityDataResponse);
        }

        // Ejecutar limpieza de tickets resueltos (>24h) de forma silenciosa
        post('/panel-control/mantenimiento/limpiar-tickets', {}).catch(err =>
          console.error("Error en mantenimiento automático:", err)
        );

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    loadDashboardData();
  }, [get, post]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Title variant="h3" weight="bold" color="text-primary">
          {t('dashboard')}
        </Title>
        <Text variant="caption" weight="bold" className="text-[var(--color-text-secondary)]/50 uppercase tracking-widest">
          Última actualización: {new Date().toLocaleString()}
        </Text>
      </div>

      {/* Acceso Directo a Portal de Servicios */}
      <div
        onClick={() => navigate('/service-portal')}
        className="cursor-pointer bg-gradient-to-r from-[var(--deep-navy)] to-[var(--color-primary)] rounded-[2.5rem] p-8 shadow-xl shadow-[var(--color-primary)]/20 text-white flex items-center justify-between group transition-all hover:-translate-y-1 hover:shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
        <div className="flex items-center space-x-6 relative z-10">
          <div className="bg-white/10 p-5 rounded-[2rem] backdrop-blur-xl border border-white/10 shadow-inner">
            <Icon name={LifeBuoy} size="xl" className="animate-pulse" />
          </div>
          <div>
            <Title variant="h3" weight="bold" color="white" className="tracking-tight">Portal de Servicios</Title>
            <Text variant="body1" color="inherit" className="text-[var(--powder-blue)] font-medium italic mt-1 opacity-90">"Crea reportes de soporte y solicitudes de desarrollo aquí"</Text>
          </div>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-[var(--color-primary-light)] group-hover:text-[var(--color-primary)] transition-all shadow-lg relative z-10">
          <Icon name={ArrowRight} size="md" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Tickets Pendientes"
          value={metrics.tickets_pendientes}
          icon={Clock}
          color="yellow"
        />
        <MetricCard
          title="Desarrollos Activos"
          value={metrics.desarrollos_activos}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Desarrollos Terminados"
          value={metrics.desarrollos_completados}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Eficiencia Global"
          value={`${metrics.porcentaje_completado}%`}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analyst Operational Load Chart */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] p-8 shadow-xl min-h-[400px]">
          <Title variant="h6" weight="bold" className="mb-6" color="text-primary">
            Carga Operativa por Analista
          </Title>
          <div className="h-[300px] w-full">
            {isMounted && analystData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                <BarChart data={analystData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis
                    dataKey="displayName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 9, fontWeight: 'bold' }}
                    interval={0}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 'bold' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }} />
                  <Bar dataKey="total" fill="var(--color-primary)" name="Tickets Asignados" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] p-8 shadow-xl min-h-[400px]">
          <Title variant="h6" weight="bold" className="mb-6" color="text-primary">
            Distribución por Prioridad
          </Title>
          <div className="h-[300px] w-full relative">
            {isMounted && priorityData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                <PieChart>
                  <Pie
                    data={priorityData as any[]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ prioridad, percent }: any) => `${prioridad || 'N/A'} ${((percent || 0) * 100).toFixed(0)}% `}
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="cantidad"
                    paddingAngle={5}
                  >
                    {priorityData?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '1.2rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Panel de Alertas Completo */}
      <AlertPanel showFilters={true} limit={5} />
    </div>
  );
};

export default Dashboard;