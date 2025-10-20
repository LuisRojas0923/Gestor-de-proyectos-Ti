import React from 'react';
import {
  CheckCircle,
  Clock,
  FileText,
  Download,
  RefreshCw,
  Users,
} from 'lucide-react';
import { 
  MaterialCard, 
  MaterialButton, 
  MaterialSelect, 
  MaterialTextField, 
  MaterialTypography,
  Spinner
} from '../../../components/atoms';
import { useRemedyReport } from '../hooks/useRemedyReport';

const RemedyReport: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  
  const { 
    data: remedyReportData, 
    loading: remedyReportLoading, 
    error: remedyReportError,
    filters,
    updateFilters,
    clearFilters,
    refreshReport
  } = useRemedyReport();

  const handleExport = (format: 'pdf' | 'excel') => {
    console.log(`Exportando reporte Remedy en formato ${format}`);
    // TODO: Implementar exportación real
  };

  if (remedyReportLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <MaterialTypography variant="h6" darkMode={darkMode} className="mt-4">
            Cargando informe Remedy...
          </MaterialTypography>
        </div>
      </div>
    );
  }

  if (remedyReportError) {
    return (
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Content>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <MaterialTypography variant="h6" darkMode={darkMode} className="text-red-600 dark:text-red-400 mb-2">
              Error al cargar el informe
            </MaterialTypography>
            <MaterialTypography variant="body2" darkMode={darkMode} className="text-red-500 dark:text-red-400">
              {remedyReportError}
            </MaterialTypography>
            <MaterialButton
              variant="contained"
              color="primary"
              icon={RefreshCw}
              onClick={refreshReport}
              darkMode={darkMode}
              className="mt-4"
            >
              Reintentar
            </MaterialButton>
          </div>
        </MaterialCard.Content>
      </MaterialCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Reporte */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <MaterialTypography variant="h5" darkMode={darkMode}>
                📊 Informe Detallado de Casos Remedy
              </MaterialTypography>
            </div>
            <div className="flex space-x-2">
              <MaterialButton
                variant="contained"
                color="secondary"
                icon={Download}
                onClick={() => handleExport('pdf')}
                darkMode={darkMode}
              >
                PDF
              </MaterialButton>
              <MaterialButton
                variant="contained"
                color="secondary"
                icon={Download}
                onClick={() => handleExport('excel')}
                darkMode={darkMode}
              >
                Excel
              </MaterialButton>
            </div>
          </div>
          <MaterialTypography variant="body2" darkMode={darkMode} className="mt-2">
            Informe detallado de todos los casos Remedy reportados en la herramienta con análisis completo de estado, progreso y métricas.
          </MaterialTypography>
        </MaterialCard.Header>
      </MaterialCard>

      {/* Filtros */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <MaterialTypography variant="h6" darkMode={darkMode}>
            Filtros del Informe
          </MaterialTypography>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MaterialSelect
              label="Estado"
              value={filters.status_filter || 'en_curso_pendiente'}
              onChange={(e) => updateFilters({ status_filter: e.target.value || undefined })}
              options={[
                { value: 'en_curso_pendiente', label: 'En Curso y Pendientes' },
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
              onChange={(e) => updateFilters({ provider_filter: e.target.value || undefined })}
              options={[
                { value: '', label: 'Todos los proveedores' },
                ...(remedyReportData ? Object.keys(remedyReportData.summary.provider_distribution)
                  .filter(provider => provider && provider.trim() !== '')
                  .map((provider, index) => ({
                    value: provider,
                    label: provider || `Proveedor ${index + 1}`
                  })) : [])
              ]}
              darkMode={darkMode}
            />
            
            <MaterialSelect
              label="Módulo"
              value={filters.module_filter || ''}
              onChange={(e) => updateFilters({ module_filter: e.target.value || undefined })}
              options={[
                { value: '', label: 'Todos los módulos' },
                ...(remedyReportData ? Object.keys(remedyReportData.summary.module_distribution)
                  .filter(module => module && module.trim() !== '')
                  .map((module, index) => ({
                    value: module,
                    label: module || `Módulo ${index + 1}`
                  })) : [])
              ]}
              darkMode={darkMode}
            />
            
            <MaterialTextField
              label="Fecha Inicio"
              type="text"
              value={filters.start_date || ''}
              onChange={(e) => updateFilters({ start_date: e.target.value || undefined })}
              darkMode={darkMode}
            />
            
            <MaterialTextField
              label="Fecha Fin"
              type="text"
              value={filters.end_date || ''}
              onChange={(e) => updateFilters({ end_date: e.target.value || undefined })}
              darkMode={darkMode}
            />
          </div>
        </MaterialCard.Content>
      </MaterialCard>

      {/* Resumen Ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MaterialCard darkMode={darkMode} className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-blue-600 dark:text-blue-400">
                  Total Casos
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-blue-900 dark:text-blue-100">
                  {remedyReportData?.summary.total_cases || 0}
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
                  {remedyReportData?.summary.status_distribution['completado'] || 0}
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
                  {remedyReportData?.summary.status_distribution['en_progreso'] || 0}
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
                  {remedyReportData?.summary.status_distribution['pendiente'] || 0}
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
                    'Nombre Desarrollo',
                    'Fecha Inicio',
                    'Próximo Seguimiento',
                    'Etapa',
                    'Actor',
                    'Tipo de Actividad'
                  ].map(header => (
                    <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {remedyReportData?.cases && remedyReportData.cases.length > 0 ? (
                  remedyReportData.cases.map((caseItem) => (
                    <tr key={caseItem.remedy_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {/* ID Remedy */}
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

                      {/* Nombre Desarrollo */}
                      <td className="px-4 py-3 text-sm">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {caseItem.name}
                          </p>
                        </div>
                      </td>

                      {/* Fecha Inicio */}
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {caseItem.important_dates.created_at 
                          ? new Date(caseItem.important_dates.created_at).toLocaleDateString()
                          : 'N/A'
                        }
                      </td>

                      {/* Próximo Seguimiento */}
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {caseItem.important_dates.estimated_end_date 
                          ? new Date(caseItem.important_dates.estimated_end_date).toLocaleDateString()
                          : caseItem.last_activity?.created_at
                          ? new Date(caseItem.last_activity.created_at).toLocaleDateString()
                          : 'N/A'
                        }
                      </td>

                      {/* Etapa */}
                      <td className="px-4 py-3 text-sm">
                        {caseItem.last_activity ? (
                          <span className="text-gray-900 dark:text-white">
                            {caseItem.last_activity.stage_name || 'N/A'}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Sin actividad</span>
                        )}
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3 text-sm">
                        {caseItem.last_activity ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            caseItem.provider ? 
                              'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' : // Proveedor
                              caseItem.main_responsible?.includes('Equipo') || caseItem.main_responsible?.includes('Interno') ?
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : // Equipo Interno
                                'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' // Usuario
                          }`}>
                            {caseItem.provider ? 'Proveedor' : 
                             caseItem.main_responsible?.includes('Equipo') || caseItem.main_responsible?.includes('Interno') ? 'Equipo Interno' : 
                             'Usuario'}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Sin actividad</span>
                        )}
                      </td>

                      {/* Tipo de Actividad */}
                      <td className="px-4 py-3 text-sm">
                        <div className="max-w-xs">
                          {caseItem.last_activity ? (
                            <p className="text-gray-900 dark:text-white truncate">
                              {caseItem.last_activity.activity_type || 'N/A'}
                            </p>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Sin actividad</span>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
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
      <div className="flex flex-wrap gap-3">
        <MaterialButton
          variant="contained"
          color="primary"
          icon={RefreshCw}
          onClick={refreshReport}
          disabled={remedyReportLoading}
          darkMode={darkMode}
        >
          Actualizar Informe
        </MaterialButton>
        
        <MaterialButton
          variant="contained"
          color="secondary"
          icon={Download}
          onClick={() => handleExport('excel')}
          darkMode={darkMode}
        >
          Exportar Excel
        </MaterialButton>
        
        <MaterialButton
          variant="contained"
          color="secondary"
          icon={Users}
          onClick={() => {/* TODO: Implementar envío por email */}}
          darkMode={darkMode}
        >
          Enviar por Email
        </MaterialButton>
        
        <MaterialButton
          variant="contained"
          color="secondary"
          icon={RefreshCw}
          onClick={clearFilters}
          darkMode={darkMode}
        >
          Limpiar Filtros
        </MaterialButton>
      </div>
    </div>
  );
};

export default RemedyReport;
