import {
    AlertTriangle,
    CheckCircle,
    Clock,
    TrendingUp
} from 'lucide-react';
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
import { AlertPanel } from '../components/alerts';
import MetricCard from '../components/common/MetricCard';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { DevelopmentUpcomingActivity } from '../types';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { darkMode } = state;
  const { get } = useApi();

  // Load metrics from API
  const [metrics, setMetrics] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    avgSLA: '0d',
  });

  const [weeklyData, setWeeklyData] = useState([
    { name: 'Lun', completed: 0, created: 0 },
    { name: 'Mar', completed: 0, created: 0 },
    { name: 'Mié', completed: 0, created: 0 },
    { name: 'Jue', completed: 0, created: 0 },
    { name: 'Vie', completed: 0, created: 0 },
    { name: 'Sáb', completed: 0, created: 0 },
    { name: 'Dom', completed: 0, created: 0 },
  ]);

  const [priorityData, setPriorityData] = useState([
    { name: 'Alta', value: 30, color: '#EF4444' },
    { name: 'Media', value: 45, color: '#F59E0B' },
    { name: 'Baja', value: 25, color: '#10B981' },
  ]);

  const [upcomingMilestones, setUpcomingMilestones] = useState<DevelopmentUpcomingActivity[]>([]);

  useEffect(() => {
    // Load dashboard data
    const loadDashboardData = async () => {
      try {
        // Load metrics
        const metricsData = await get('/dashboard/metrics');
        if (metricsData) {
          setMetrics(metricsData);
        }
        
        // Load weekly progress
        const weeklyDataResponse = await get('/dashboard/weekly-progress');
        if (weeklyDataResponse) {
          setWeeklyData(weeklyDataResponse);
        }
        
        // Load priority distribution
        const priorityDataResponse = await get('/dashboard/priority-distribution');
        if (priorityDataResponse) {
          setPriorityData(priorityDataResponse);
        }
        
        // Load upcoming milestones from alerts endpoint
        const milestonesData = await get('/alerts/upcoming?limit=5');
        if (milestonesData && milestonesData.all_activities) {
          setUpcomingMilestones(milestonesData.all_activities);
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
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          {t('dashboard')}
        </h1>
        <div className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Última actualización: {new Date().toLocaleString()}
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
        <div className={`${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            darkMode ? 'text-white' : 'text-neutral-900'
          }`}>
            {t('weeklyProgress')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fill: darkMode ? '#a3a3a3' : '#525252' }}
              />
              <YAxis tick={{ fill: darkMode ? '#a3a3a3' : '#525252' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#262626' : '#ffffff',
                  border: darkMode ? '1px solid #404040' : '1px solid #e5e5e5',
                  borderRadius: '8px',
                  color: darkMode ? '#ffffff' : '#000000',
                }}
              />
              <Bar dataKey="completed" fill="#0066A5" name="Completados" />
              <Bar dataKey="created" fill="#00B388" name="Creados" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className={`${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            darkMode ? 'text-white' : 'text-neutral-900'
          }`}>
            Distribución por Prioridad
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Panel de Alertas Completo */}
      <AlertPanel showFilters={true} limit={5} />
    </div>
  );
};

export default Dashboard;