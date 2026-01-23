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

interface WeeklyProgressData {
  semana: string;
  nombre: string;
  completados: number;
  creados: number;
  pendientes: number;
}

interface PriorityData {
  prioridad: string;
  cantidad: number;
  color: string;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { get } = useApi<any>();
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

  const [weeklyData, setWeeklyData] = useState<WeeklyProgressData[]>([]);
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

        // Load weekly progress
        const weeklyDataResponse = await get(API_ENDPOINTS.DASHBOARD_WEEKLY_PROGRESS) as WeeklyProgressData[] | null;
        if (weeklyDataResponse) {
          setWeeklyData(weeklyDataResponse);
        }

        // Load priority distribution
        const priorityDataResponse = await get(API_ENDPOINTS.DASHBOARD_PRIORITY_DISTRIBUTION) as PriorityData[] | null;
        if (priorityDataResponse) {
          setPriorityData(priorityDataResponse);
        }


      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    loadDashboardData();
  }, [get]);

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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Tickets Pendientes"
          value={metrics.tickets_pendientes}
          change={{ value: 12, type: 'increase' }}
          icon={Clock}
          color="yellow"
        />
        <MetricCard
          title="Desarrollos Activos"
          value={metrics.desarrollos_activos}
          change={{ value: 8, type: 'decrease' }}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Desarrollos Terminados"
          value={metrics.desarrollos_completados}
          change={{ value: 15, type: 'increase' }}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Eficiencia Global"
          value={`${metrics.porcentaje_completado}%`}
          change={{ value: 5, type: 'decrease' }}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress Chart */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] p-8 shadow-xl min-h-[400px]">
          <Title variant="h6" weight="bold" className="mb-6" color="text-primary">
            {t('weeklyProgress')}
          </Title>
          <div className="h-[300px] w-full">
            {isMounted && weeklyData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis
                    dataKey="nombre"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 'bold' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 'bold' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '1.5rem',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    }}
                    itemStyle={{ color: 'var(--color-text-primary)' }}
                  />
                  <Bar dataKey="completados" fill="var(--color-primary)" name="Completados" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="creados" fill="var(--color-primary-light)" name="Creados" radius={[6, 6, 0, 0]} />
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