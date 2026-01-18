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
  pending: number;
  inProgress: number;
  completed: number;
  avgSLA: string;
}

interface WeeklyProgressData {
  name: string;
  completed: number;
  created: number;
}

interface PriorityData {
  name: string;
  value: number;
  color: string;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { get } = useApi<any>();
  const navigate = useNavigate();

  // Load metrics from API
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    pending: 0,
    inProgress: 0,
    completed: 0,
    avgSLA: '0d',
  });

  const [weeklyData, setWeeklyData] = useState<WeeklyProgressData[]>([
    { name: 'Lun', completed: 0, created: 0 },
    { name: 'Mar', completed: 0, created: 0 },
    { name: 'Mié', completed: 0, created: 0 },
    { name: 'Jue', completed: 0, created: 0 },
    { name: 'Vie', completed: 0, created: 0 },
    { name: 'Sáb', completed: 0, created: 0 },
    { name: 'Dom', completed: 0, created: 0 },
  ]);

  const [priorityData, setPriorityData] = useState<PriorityData[]>([
    { name: 'Alta', value: 30, color: '#EF4444' },
    { name: 'Media', value: 45, color: '#F59E0B' },
    { name: 'Baja', value: 25, color: '#10B981' },
  ]);


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
            <Title variant="h3" weight="bold" className="tracking-tight">Portal de Servicios</Title>
            <Text variant="body1" className="text-[var(--powder-blue)] font-medium italic mt-1 opacity-90">"Crea reportes de soporte y solicitudes de desarrollo aquí"</Text>
          </div>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-[var(--color-primary-light)] group-hover:text-[var(--color-primary)] transition-all shadow-lg relative z-10">
          <Icon name={ArrowRight} size="md" />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title={t('pending')}
          value={metrics.pending}
          change={{ value: 12, type: 'increase' }}
          icon={Clock}
          color="yellow"
        />
        <MetricCard
          title={t('inProgress')}
          value={metrics.inProgress}
          change={{ value: 8, type: 'decrease' }}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title={t('completed')}
          value={metrics.completed}
          change={{ value: 15, type: 'increase' }}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title={t('avgSLA')}
          value={metrics.avgSLA}
          change={{ value: 5, type: 'decrease' }}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress Chart */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] p-8 shadow-xl">
          <Title variant="h6" weight="bold" className="mb-6" color="text-primary">
            {t('weeklyProgress')}
          </Title>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
              <XAxis
                dataKey="name"
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
              <Bar dataKey="completed" fill="var(--color-primary)" name="Completados" radius={[6, 6, 0, 0]} />
              <Bar dataKey="created" fill="var(--color-primary-light)" name="Creados" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] p-8 shadow-xl">
          <Title variant="h6" weight="bold" className="mb-6" color="text-primary">
            Distribución por Prioridad
          </Title>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData as any[]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}% `}
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={5}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '1.2rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Panel de Alertas Completo */}
      <AlertPanel showFilters={true} limit={5} />
    </div>
  );
};

export default Dashboard;