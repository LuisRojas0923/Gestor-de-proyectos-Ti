import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Download,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import MetricCard from '../components/common/MetricCard';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { darkMode } = state;

  const [dateRange, setDateRange] = useState({
    start: '2025-01-01',
    end: '2025-01-31',
  });
  const [selectedMetric, setSelectedMetric] = useState('all');
  const chartRef = useRef<HTMLDivElement>(null);

  // Sample data
  const kpiData = {
    totalRequirements: 234,
    completedRequirements: 189,
    avgCycleTime: 2.3,
    slaCompliance: 89,
    controlsExecuted: 567,
    pendingTasks: 45,
  };

  const cycleTimeData = [
    { name: 'Sem 1', tiempo: 2.1, objetivo: 2.5 },
    { name: 'Sem 2', tiempo: 2.3, objetivo: 2.5 },
    { name: 'Sem 3', tiempo: 2.8, objetivo: 2.5 },
    { name: 'Sem 4', tiempo: 2.0, objetivo: 2.5 },
    { name: 'Sem 5', tiempo: 1.9, objetivo: 2.5 },
  ];

  const controlComplianceData = [
    { name: 'C003-GT', cumplido: 95, total: 100 },
    { name: 'C021-GT', cumplido: 88, total: 100 },
    { name: 'C004-GT', cumplido: 92, total: 100 },
    { name: 'C027-GT', cumplido: 85, total: 100 },
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

  const exportToPDF = () => {
    // Implementation for PDF export
    console.log('Exporting to PDF...');
  };

  const exportToCSV = () => {
    // Implementation for CSV export
    console.log('Exporting to CSV...');
  };

  const COLORS = ['#0066A5', '#00B388', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          {t('reports')}
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-neutral-800 border-neutral-600 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'
              } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            <span className={darkMode ? 'text-neutral-400' : 'text-neutral-600'}>a</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-neutral-800 border-neutral-600 text-white'
                  : 'bg-white border-neutral-300 text-neutral-900'
              } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToPDF}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FileText size={20} />
              <span>PDF</span>
            </button>
            <button
              onClick={exportToCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download size={20} />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requerimientos"
          value={kpiData.totalRequirements}
          change={{ value: 12, type: 'increase' }}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="Completados"
          value={kpiData.completedRequirements}
          change={{ value: 8, type: 'increase' }}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Tiempo Ciclo Promedio"
          value={`${kpiData.avgCycleTime}d`}
          change={{ value: 5, type: 'decrease' }}
          icon={Clock}
          color="yellow"
        />
        <MetricCard
          title="Cumplimiento SLA"
          value={`${kpiData.slaCompliance}%`}
          change={{ value: 3, type: 'increase' }}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cycle Time Trend */}
        <div className={`${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center ${
            darkMode ? 'text-white' : 'text-neutral-900'
          }`}>
            <Clock className="mr-2" size={20} />
            Tiempo de Ciclo por Semana
          </h3>
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
        </div>

        {/* Priority Distribution */}
        <div className={`${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center ${
            darkMode ? 'text-white' : 'text-neutral-900'
          }`}>
            <PieChart className="mr-2" size={20} />
            Distribución por Prioridad
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={priorityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
        </div>

        {/* Control Compliance */}
        <div className={`${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center ${
            darkMode ? 'text-white' : 'text-neutral-900'
          }`}>
            <CheckCircle className="mr-2" size={20} />
            Cumplimiento de Controles
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={controlComplianceData}>
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
              <Bar dataKey="cumplido" fill="#00B388" name="Cumplido %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team Performance */}
        <div className={`${
          darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center ${
            darkMode ? 'text-white' : 'text-neutral-900'
          }`}>
            <Users className="mr-2" size={20} />
            Rendimiento del Equipo
          </h3>
          <div className="space-y-4">
            {teamPerformanceData.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700">
                <div className="flex-1">
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                    {member.name}
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {member.completados}/{member.asignados} completados
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    member.sla >= 90 ? 'text-green-500' : member.sla >= 80 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {member.sla}%
                  </span>
                  <p className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    SLA
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className={`${
        darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
      } border rounded-xl p-6`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${
          darkMode ? 'text-white' : 'text-neutral-900'
        }`}>
          <TrendingUp className="mr-2" size={20} />
          Tendencia de Requerimientos
        </h3>
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
              name="Requerimientos"
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
      </div>
    </div>
  );
};

export default Reports;