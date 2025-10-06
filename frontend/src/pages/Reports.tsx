import {
    CheckCircle,
    Clock,
    Download,
    FileText,
    PieChart,
    TrendingUp,
    Users,
    RefreshCw,
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
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
import { MetricCard } from '../components/molecules';
import { 
    MaterialCard, 
    MaterialButton, 
    MaterialSelect, 
    MaterialTextField, 
    MaterialTypography,
    Badge,
    Spinner
} from '../components/atoms';
import { useAppContext } from '../context/AppContext';
import { useRemedyReport } from './Reports/hooks/useRemedyReport';

// Load development data from API
// import { Development as DevelopmentType } from './MyDevelopments';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const { darkMode } = state;
  
  // Hook para el informe de casos Remedy
  const { 
    data: remedyReportData, 
    loading: remedyReportLoading, 
    error: remedyReportError,
    filters,
    updateFilters,
    clearFilters,
    refreshReport
  } = useRemedyReport();

  const [dateRange, setDateRange] = useState({
    start: '2025-01-01',
    end: '2025-01-31',
  });
  
  // Load KPI data from API
  const [kpiData, setKpiData] = useState({
    totalDevelopments: 0,
    completedDevelopments: 0,
    avgCycleTime: 0,
    slaCompliance: 0,
    controlsExecuted: 0,
    pendingTasks: 0,
  });

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
          title="Total Desarrollos"
          value={kpiData.totalDevelopments}
          change={{ value: 12, type: 'increase' }}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="Completados"
          value={kpiData.completedDevelopments}
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
          Tendencia de Desarrollos
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
      </div>

      {/* Manager's Monthly Report Section */}
      <div className={`${
        darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
      } border rounded-xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold flex items-center ${
            darkMode ? 'text-white' : 'text-neutral-900'
          }`}>
            <FileText className="mr-2" size={20} />
            Reporte Mensual Consolidado para Directivos
          </h3>
          <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Download size={18} />
            <span>Generar Reporte</span>
          </button>
        </div>
        
        <div className="overflow-x-auto">
            <div className="min-w-full inline-block align-middle">
              <div className="border rounded-lg overflow-hidden border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className={darkMode ? 'bg-neutral-700' : 'bg-neutral-50'}>
                    <tr>
                      {['ID', 'Nombre', 'Responsable', 'Estado', 'Fecha Inicio', 'Fecha Cierre Est.', 'Desfase (días)', 'Incidencias'].map(header => (
                         <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                           {header}
                         </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {/* TODO: Load developments data from API */}
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                        No hay datos disponibles. Los datos se cargarán desde la API.
                          </td>
                        </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      </div>

      {/* Informe Detallado de Casos Remedy */}
      <div className="mt-8">
        <MaterialCard darkMode={darkMode}>
          <MaterialCard.Header>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <MaterialTypography variant="h5" darkMode={darkMode}>
                  📊 Informe Detallado de Casos Remedy
                </MaterialTypography>
              </div>
              <MaterialButton
                variant="contained"
                color="primary"
                startIcon={<Download className="h-4 w-4" />}
                onClick={() => {/* TODO: Implementar exportación */}}
                darkMode={darkMode}
              >
                Exportar PDF
              </MaterialButton>
            </div>
            <MaterialTypography variant="body2" darkMode={darkMode} className="mt-2">
              Informe detallado de todos los casos Remedy reportados en la herramienta con análisis completo de estado, progreso y métricas.
            </MaterialTypography>
          </MaterialCard.Header>

          <MaterialCard.Content>
            {/* Filtros del Informe */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <MaterialSelect
                label="Estado"
                value={filters.status_filter || ''}
                onChange={(value) => updateFilters({ status_filter: value || undefined })}
                options={[
                  { value: '', label: 'Todos los estados' },
                  { value: 'en_progreso', label: 'En Progreso' },
                  { value: 'completado', label: 'Completado' },
                  { value: 'pendiente', label: 'Pendiente' },
                  { value: 'cancelado', label: 'Cancelado' }
                ]}
                darkMode={darkMode}
              />
              
              <MaterialSelect
                label="Proveedor"
                value={filters.provider_filter || ''}
                onChange={(value) => updateFilters({ provider_filter: value || undefined })}
                options={[
                  { value: '', label: 'Todos los proveedores' },
                  ...(remedyReportData ? Object.keys(remedyReportData.summary.provider_distribution)
                    .filter(provider => provider && provider.trim() !== '') // Filtrar valores vacíos
                    .map((provider, index) => ({
                      value: provider,
                      label: provider || `Proveedor ${index + 1}` // Fallback para valores vacíos
                    })) : [])
                ]}
                darkMode={darkMode}
              />
              
              <MaterialSelect
                label="Módulo"
                value={filters.module_filter || ''}
                onChange={(value) => updateFilters({ module_filter: value || undefined })}
                options={[
                  { value: '', label: 'Todos los módulos' },
                  ...(remedyReportData ? Object.keys(remedyReportData.summary.module_distribution)
                    .filter(module => module && module.trim() !== '') // Filtrar valores vacíos
                    .map((module, index) => ({
                      value: module,
                      label: module || `Módulo ${index + 1}` // Fallback para valores vacíos
                    })) : [])
                ]}
                darkMode={darkMode}
              />
              
              <MaterialTextField
                label="Fecha Inicio"
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => updateFilters({ start_date: e.target.value || undefined })}
                darkMode={darkMode}
              />
              
              <MaterialTextField
                label="Fecha Fin"
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => updateFilters({ end_date: e.target.value || undefined })}
                darkMode={darkMode}
              />
            </div>

            {/* Resumen Ejecutivo */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MaterialCard darkMode={darkMode} className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <MaterialCard.Content>
                  <div className="flex items-center justify-between">
                    <div>
                      <MaterialTypography variant="body2" darkMode={darkMode} className="text-blue-600 dark:text-blue-400">
                        Total Casos
                      </MaterialTypography>
                      <MaterialTypography variant="h4" darkMode={darkMode} className="text-blue-900 dark:text-blue-100">
                        {remedyReportLoading ? '...' : remedyReportData?.summary.total_cases || 0}
                      </MaterialTypography>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </MaterialCard.Content>
              </MaterialCard>
              
              <MaterialCard darkMode={darkMode} className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <MaterialCard.Content>
                  <div className="flex items-center justify-between">
                    <div>
                      <MaterialTypography variant="body2" darkMode={darkMode} className="text-green-600 dark:text-green-400">
                        Completados
                      </MaterialTypography>
                      <MaterialTypography variant="h4" darkMode={darkMode} className="text-green-900 dark:text-green-100">
                        {remedyReportLoading ? '...' : remedyReportData?.summary.status_distribution['completado'] || 0}
                      </MaterialTypography>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </MaterialCard.Content>
              </MaterialCard>
              
              <MaterialCard darkMode={darkMode} className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <MaterialCard.Content>
                  <div className="flex items-center justify-between">
                    <div>
                      <MaterialTypography variant="body2" darkMode={darkMode} className="text-yellow-600 dark:text-yellow-400">
                        En Progreso
                      </MaterialTypography>
                      <MaterialTypography variant="h4" darkMode={darkMode} className="text-yellow-900 dark:text-yellow-100">
                        {remedyReportLoading ? '...' : remedyReportData?.summary.status_distribution['en_progreso'] || 0}
                      </MaterialTypography>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </MaterialCard.Content>
              </MaterialCard>
              
              <MaterialCard darkMode={darkMode} className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <MaterialCard.Content>
                  <div className="flex items-center justify-between">
                    <div>
                      <MaterialTypography variant="body2" darkMode={darkMode} className="text-red-600 dark:text-red-400">
                        Pendientes
                      </MaterialTypography>
                      <MaterialTypography variant="h4" darkMode={darkMode} className="text-red-900 dark:text-red-100">
                        {remedyReportLoading ? '...' : remedyReportData?.summary.status_distribution['pendiente'] || 0}
                      </MaterialTypography>
                    </div>
                    <Clock className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                </MaterialCard.Content>
              </MaterialCard>
            </div>

            {/* Tabla Detallada de Casos */}
            <MaterialCard darkMode={darkMode}>
              <MaterialCard.Content>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {[
                          'ID Remedy',
                          'Nombre',
                          'Módulo',
                          'Estado Actual',
                          'Última Actividad',
                          'Progreso',
                          'Responsable',
                          'Proveedor',
                          'Fecha Creación',
                          'Incidencias'
                        ].map(header => (
                          <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {remedyReportLoading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center space-y-2">
                          <Spinner size="lg" darkMode={darkMode} />
                          <MaterialTypography variant="h6" darkMode={darkMode}>
                            Cargando informe detallado...
                          </MaterialTypography>
                          <MaterialTypography variant="body2" darkMode={darkMode}>
                            Los datos se están cargando desde el servidor
                          </MaterialTypography>
                        </div>
                      </td>
                    </tr>
                  ) : remedyReportError ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-red-500 dark:text-red-400">
                        <div className="flex flex-col items-center space-y-2">
                          <FileText className="h-12 w-12 text-red-400" />
                          <MaterialTypography variant="h6" darkMode={darkMode} className="text-red-600 dark:text-red-400">
                            Error al cargar el informe
                          </MaterialTypography>
                          <MaterialTypography variant="body2" darkMode={darkMode} className="text-red-500 dark:text-red-400">
                            {remedyReportError}
                          </MaterialTypography>
                        </div>
                      </td>
                    </tr>
                  ) : remedyReportData?.cases && remedyReportData.cases.length > 0 ? (
                    remedyReportData.cases.map((caseItem) => (
                      <tr key={caseItem.remedy_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {caseItem.remedy_id}
                            </span>
                            {caseItem.remedy_link && (
                              <a 
                                href={caseItem.remedy_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                🔗
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="max-w-xs">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {caseItem.name}
                            </p>
                            {caseItem.description && (
                              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                {caseItem.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {caseItem.module}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge 
                            variant={
                              caseItem.general_status === 'completado' ? 'success' :
                              caseItem.general_status === 'en_progreso' ? 'warning' :
                              caseItem.general_status === 'pendiente' ? 'error' : 'default'
                            }
                            darkMode={darkMode}
                          >
                            {caseItem.general_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {caseItem.last_activity ? (
                            <div className="max-w-xs">
                              <p className="text-gray-900 dark:text-white truncate">
                                {caseItem.last_activity.stage_name}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">
                                {caseItem.last_activity.activity_type} - {caseItem.last_activity.status}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Sin actividad</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${caseItem.progress_percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-900 dark:text-white text-xs">
                              {caseItem.progress_percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {caseItem.main_responsible || 'Sin asignar'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {caseItem.provider || 'Sin proveedor'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {caseItem.important_dates.created_at 
                            ? new Date(caseItem.important_dates.created_at).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge 
                            variant={caseItem.post_production_incidents.length > 0 ? 'error' : 'success'}
                            darkMode={darkMode}
                          >
                            {caseItem.post_production_incidents.length}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center space-y-2">
                          <FileText className="h-12 w-12 text-gray-400" />
                          <MaterialTypography variant="h6" darkMode={darkMode}>
                            No hay casos encontrados
                          </MaterialTypography>
                          <MaterialTypography variant="body2" darkMode={darkMode}>
                            No se encontraron casos Remedy con los filtros aplicados
                          </MaterialTypography>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                  </table>
                </div>
              </MaterialCard.Content>
            </MaterialCard>

            {/* Acciones del Informe */}
            <div className="mt-6 flex flex-wrap gap-3">
              <MaterialButton
                variant="contained"
                color="success"
                startIcon={<RefreshCw className={`h-4 w-4 ${remedyReportLoading ? 'animate-spin' : ''}`} />}
                onClick={refreshReport}
                disabled={remedyReportLoading}
                darkMode={darkMode}
              >
                Actualizar Informe
              </MaterialButton>
              
              <MaterialButton
                variant="contained"
                color="secondary"
                startIcon={<Download className="h-4 w-4" />}
                onClick={() => {/* TODO: Implementar exportación Excel */}}
                darkMode={darkMode}
              >
                Exportar Excel
              </MaterialButton>
              
              <MaterialButton
                variant="contained"
                color="info"
                startIcon={<Users className="h-4 w-4" />}
                onClick={() => {/* TODO: Implementar envío por email */}}
                darkMode={darkMode}
              >
                Enviar por Email
              </MaterialButton>
              
              <MaterialButton
                variant="contained"
                color="warning"
                startIcon={<RefreshCw className="h-4 w-4" />}
                onClick={clearFilters}
                darkMode={darkMode}
              >
                Limpiar Filtros
              </MaterialButton>
            </div>
          </MaterialCard.Content>
        </MaterialCard>
      </div>

    </div>
  );
};

export default Reports;