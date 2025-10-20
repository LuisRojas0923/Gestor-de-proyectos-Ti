import React from 'react';
import {
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MetricCard } from '../../../components/molecules';
import { 
  MaterialCard, 
  MaterialTypography,
  Spinner
} from '../../../components/atoms';

export interface KPIData {
  totalDevelopments: number;
  completedDevelopments: number;
  avgCycleTime: number;
  slaCompliance: number;
  controlsExecuted: number;
  pendingTasks: number;
}

export interface KPIDashboardProps {
  data: KPIData;
  loading: boolean;
  darkMode: boolean;
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({
  data,
  loading,
  darkMode,
}) => {

  // Datos simulados para los gráficos (en producción vendrían de la API)
  const cycleTimeData = [
    { name: 'Sem 1', tiempo: 2.1, objetivo: 2.5 },
    { name: 'Sem 2', tiempo: 2.3, objetivo: 2.5 },
    { name: 'Sem 3', tiempo: 2.8, objetivo: 2.5 },
    { name: 'Sem 4', tiempo: 2.0, objetivo: 2.5 },
    { name: 'Sem 5', tiempo: 1.9, objetivo: 2.5 },
  ];

  const priorityDistribution = [
    { name: 'Alta', value: 78, color: '#EF4444' },
    { name: 'Media', value: 124, color: '#F59E0B' },
    { name: 'Baja', value: 32, color: '#10B981' },
  ];

  const teamPerformanceData = [
    { name: 'Ana García', completados: 45, asignados: 52, sla: 92 },
    { name: 'Carlos López', completados: 38, asignados: 41, sla: 88 },
    { name: 'María Rodríguez', completados: 42, asignados: 48, sla: 95 },
    { name: 'Pedro Sánchez', completados: 35, asignados: 39, sla: 90 },
    { name: 'Laura Martín', completados: 29, asignados: 34, sla: 87 },
  ];

  const trendData = [
    { date: '2025-01-01', requerimientos: 12, completados: 8 },
    { date: '2025-01-08', requerimientos: 18, completados: 14 },
    { date: '2025-01-15', requerimientos: 15, completados: 12 },
    { date: '2025-01-22', requerimientos: 22, completados: 18 },
    { date: '2025-01-29', requerimientos: 19, completados: 16 },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <MaterialTypography variant="h6" darkMode={darkMode} className="mt-4">
            Cargando dashboard...
          </MaterialTypography>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Desarrollos"
          value={data.totalDevelopments}
          change={{ value: 12, type: 'increase' }}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="Completados"
          value={data.completedDevelopments}
          change={{ value: 8, type: 'increase' }}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Tiempo Ciclo Promedio"
          value={`${data.avgCycleTime}d`}
          change={{ value: 5, type: 'decrease' }}
          icon={Clock}
          color="yellow"
        />
        <MetricCard
          title="Cumplimiento SLA"
          value={`${data.slaCompliance}%`}
          change={{ value: 3, type: 'increase' }}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cycle Time Trend */}
        <MaterialCard darkMode={darkMode}>
          <MaterialCard.Header>
            <div className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-blue-600" />
              <MaterialTypography variant="h6" darkMode={darkMode}>
                Tiempo de Ciclo por Semana
              </MaterialTypography>
            </div>
          </MaterialCard.Header>
          <MaterialCard.Content>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cycleTimeData}>
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
                <Line 
                  type="monotone" 
                  dataKey="tiempo" 
                  stroke="#0066A5" 
                  strokeWidth={2}
                  name="Tiempo Real (días)"
                />
                <Line 
                  type="monotone" 
                  dataKey="objetivo" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Objetivo (días)"
                />
              </LineChart>
            </ResponsiveContainer>
          </MaterialCard.Content>
        </MaterialCard>

        {/* Priority Distribution */}
        <MaterialCard darkMode={darkMode}>
          <MaterialCard.Header>
            <div className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
              <MaterialTypography variant="h6" darkMode={darkMode}>
                Distribución por Prioridad
              </MaterialTypography>
            </div>
          </MaterialCard.Header>
          <MaterialCard.Content>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={priorityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </MaterialCard.Content>
        </MaterialCard>
      </div>

      {/* Team Performance */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-purple-600" />
            <MaterialTypography variant="h6" darkMode={darkMode}>
              Rendimiento del Equipo
            </MaterialTypography>
          </div>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <div className="space-y-4">
            {teamPerformanceData.map((member, index) => (
              <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${
                darkMode ? 'bg-neutral-700' : 'bg-neutral-50'
              }`}>
                <div className="flex-1">
                  <MaterialTypography variant="subtitle1" darkMode={darkMode}>
                    {member.name}
                  </MaterialTypography>
                  <MaterialTypography variant="body2" darkMode={darkMode} className="text-neutral-600 dark:text-neutral-400">
                    {member.completados}/{member.asignados} completados
                  </MaterialTypography>
                </div>
                <div className="text-right">
                  <MaterialTypography 
                    variant="h6" 
                    darkMode={darkMode}
                    className={
                      member.sla >= 90 ? 'text-green-500' : 
                      member.sla >= 80 ? 'text-yellow-500' : 'text-red-500'
                    }
                  >
                    {member.sla}%
                  </MaterialTypography>
                  <MaterialTypography variant="caption" darkMode={darkMode} className="text-neutral-600 dark:text-neutral-400">
                    SLA
                  </MaterialTypography>
                </div>
              </div>
            ))}
          </div>
        </MaterialCard.Content>
      </MaterialCard>

      {/* Trend Analysis */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <div className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
            <MaterialTypography variant="h6" darkMode={darkMode}>
              Tendencia de Desarrollos
            </MaterialTypography>
          </div>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorRequerimientos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0066A5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0066A5" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorCompletados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B388" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00B388" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: darkMode ? '#a3a3a3' : '#525252' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fill: darkMode ? '#a3a3a3' : '#525252' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#262626' : '#ffffff',
                  border: darkMode ? '1px solid #404040' : '1px solid #e5e5e5',
                  borderRadius: '8px',
                  color: darkMode ? '#ffffff' : '#000000',
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
              />
              <Area
                type="monotone"
                dataKey="requerimientos"
                stroke="#0066A5"
                fillOpacity={1}
                fill="url(#colorRequerimientos)"
                name="Desarrollos"
              />
              <Area
                type="monotone"
                dataKey="completados"
                stroke="#00B388"
                fillOpacity={1}
                fill="url(#colorCompletados)"
                name="Completados"
              />
            </AreaChart>
          </ResponsiveContainer>
        </MaterialCard.Content>
      </MaterialCard>
    </div>
  );
};

export default KPIDashboard;
