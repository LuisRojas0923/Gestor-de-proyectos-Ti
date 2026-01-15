import {
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MetricCard } from '../components/molecules';
import { useAppContext } from '../context/AppContext';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
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

const API_BASE_URL = API_CONFIG.BASE_URL;

interface AnalystPerformance {
  name: string;
  total: number;
  cerrados: number;
  avg_time: number;
  performance_score: number;
}

const Indicators: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;

  const [summary, setSummary] = useState({
    total: 0,
    pendientes: 0,
    cerrados: 0,
    escalados: 0,
    completion_rate: 0
  });
  const [analysts, setAnalysts] = useState<AnalystPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [summaryRes, performanceRes] = await Promise.all([
          axios.get(`${API_BASE_URL}${API_ENDPOINTS.TICKET_STATS_SUMMARY}`),
          axios.get(`${API_BASE_URL}${API_ENDPOINTS.TICKET_STATS_PERFORMANCE}`)
        ]);
        setSummary(summaryRes.data);
        setAnalysts(performanceRes.data);
      } catch (error) {
        console.error("Error cargando indicadores:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) return <div className="p-10 text-center">Cargando indicadores de gestión...</div>;

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div>
        <h1 className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
          Indicadores de Gestión TI
        </h1>
        <p className="text-gray-500">Métricas de desempeño de analistas y estado de la cola de soporte</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Actividades Pendientes"
          value={summary.pendientes.toString()}
          change={{ value: 12, type: 'increase' }}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Tickets Resueltos"
          value={summary.cerrados.toString()}
          change={{ value: 5, type: 'increase' }}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Tasa de Cierre"
          value={`${summary.completion_rate.toFixed(1)}%`}
          change={{ value: 3, type: 'increase' }}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Tickets Escalados"
          value={summary.escalados.toString()}
          change={{ value: 0, type: 'decrease' }}
          icon={AlertCircle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ranking de Analistas */}
        <div className={`lg:col-span-2 ${darkMode ? 'bg-neutral-800' : 'bg-white'} rounded-[2.5rem] p-8 shadow-sm border border-gray-100`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Activity className="text-blue-500" />
              <h2 className="text-xl font-bold">Desempeño por Analista</h2>
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Efficiency Ranking</span>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#444' : '#f0f0f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#888' : '#666', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#888' : '#666', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar dataKey="performance_score" radius={[8, 8, 0, 0]} barSize={40}>
                  {analysts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución de Carga */}
        <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} rounded-[2.5rem] p-8 shadow-sm border border-gray-100`}>
          <h2 className="text-xl font-bold mb-6">Distribución de Carga</h2>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analysts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total"
                >
                  {analysts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3B82F6', '#818CF8', '#A5B4FC', '#C7D2FE'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black">{summary.total}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total Tickets</span>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {analysts.slice(0, 3).map((analyst, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${['bg-blue-500', 'bg-indigo-400', 'bg-indigo-200'][i % 3]}`}></div>
                  <span className="text-sm font-bold text-gray-700">{analyst.name}</span>
                </div>
                <span className="text-sm font-mono text-gray-400">{analyst.total} tks</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Listado Detallado (Tabla Premium) */}
      <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} rounded-[2.5rem] p-4 shadow-sm border border-gray-100 overflow-hidden`}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Analista</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Asignados</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Resueltos</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Eficiencia (%)</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Prom. Atención</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {analysts.map((analyst, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {analyst.name[0]}
                    </div>
                    <span className="font-bold text-gray-900">{analyst.name}</span>
                  </div>
                </td>
                <td className="px-6 py-5 font-mono text-gray-600">{analyst.total}</td>
                <td className="px-6 py-5 font-mono text-gray-600">{analyst.cerrados}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center space-x-2">
                    <div className="flex-grow bg-gray-100 h-1.5 rounded-full overflow-hidden max-w-[60px]">
                      <div className="bg-blue-500 h-full" style={{ width: `${analyst.performance_score}%` }}></div>
                    </div>
                    <span className="text-xs font-bold">{analyst.performance_score.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-xs font-bold px-3 py-1 bg-gray-100 rounded-lg text-gray-500">
                    {analyst.avg_time.toFixed(1)}h
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Indicators;
