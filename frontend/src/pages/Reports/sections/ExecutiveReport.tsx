import React from 'react';
import { FileText, Download, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { 
  MaterialCard, 
  MaterialButton, 
  MaterialTypography
} from '../../../components/atoms';

const ExecutiveReport: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {

  const handleExport = () => {
    console.log('Exportando reporte ejecutivo...');
    // TODO: Implementar exportación real
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <MaterialTypography variant="h5" darkMode={darkMode}>
                📈 Reporte Ejecutivo Consolidado
              </MaterialTypography>
            </div>
            <MaterialButton
              variant="contained"
              color="primary"
              icon={Download}
              onClick={handleExport}
              darkMode={darkMode}
            >
              Generar Reporte
            </MaterialButton>
          </div>
          <MaterialTypography variant="body2" darkMode={darkMode} className="mt-2">
            Resumen ejecutivo para directivos con métricas clave y análisis de tendencias.
          </MaterialTypography>
        </MaterialCard.Header>
      </MaterialCard>

      {/* Métricas Ejecutivas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MaterialCard darkMode={darkMode} className="bg-blue-50 dark:bg-blue-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-blue-600 dark:text-blue-400">
                  ROI del Proyecto
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-blue-900 dark:text-blue-100">
                  245%
                </MaterialTypography>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard darkMode={darkMode} className="bg-green-50 dark:bg-green-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-green-600 dark:text-green-400">
                  Eficiencia del Equipo
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-green-900 dark:text-green-100">
                  92%
                </MaterialTypography>
              </div>
              <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard darkMode={darkMode} className="bg-yellow-50 dark:bg-yellow-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-yellow-600 dark:text-yellow-400">
                  Riesgos Activos
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-yellow-900 dark:text-yellow-100">
                  3
                </MaterialTypography>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard darkMode={darkMode} className="bg-purple-50 dark:bg-purple-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-purple-600 dark:text-purple-400">
                  Satisfacción Cliente
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-purple-900 dark:text-purple-100">
                  4.8/5
                </MaterialTypography>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>
      </div>

      {/* Tabla de Desarrollos para Directivos */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <MaterialTypography variant="h6" darkMode={darkMode}>
            Resumen de Desarrollos por Responsable
          </MaterialTypography>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className={darkMode ? 'bg-neutral-700' : 'bg-neutral-50'}>
                <tr>
                  {['Responsable', 'Total', 'Completados', 'En Progreso', 'Retrasos', 'SLA Cumplido'].map(header => (
                     <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                       {header}
                     </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="h-12 w-12 text-neutral-400" />
                      <MaterialTypography variant="h6" darkMode={darkMode}>
                        Implementando integración con API
                      </MaterialTypography>
                      <MaterialTypography variant="body2" darkMode={darkMode}>
                        Los datos se cargarán desde el backend
                      </MaterialTypography>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </MaterialCard.Content>
      </MaterialCard>

      {/* Recomendaciones Ejecutivas */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <MaterialTypography variant="h6" darkMode={darkMode}>
            Recomendaciones Estratégicas
          </MaterialTypography>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
              <MaterialTypography variant="subtitle1" darkMode={darkMode} className="text-blue-900 dark:text-blue-100 mb-2">
                🎯 Optimización de Procesos
              </MaterialTypography>
              <MaterialTypography variant="body2" darkMode={darkMode} className="text-blue-800 dark:text-blue-200">
                Implementar automatización en las etapas de testing para reducir el tiempo de ciclo en un 15%.
              </MaterialTypography>
            </div>

            <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border`}>
              <MaterialTypography variant="subtitle1" darkMode={darkMode} className="text-green-900 dark:text-green-100 mb-2">
                📈 Expansión de Capacidad
              </MaterialTypography>
              <MaterialTypography variant="body2" darkMode={darkMode} className="text-green-800 dark:text-green-200">
                Considerar la contratación de 2 desarrolladores adicionales para el próximo trimestre.
              </MaterialTypography>
            </div>

            <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border`}>
              <MaterialTypography variant="subtitle1" darkMode={darkMode} className="text-yellow-900 dark:text-yellow-100 mb-2">
                ⚠️ Gestión de Riesgos
              </MaterialTypography>
              <MaterialTypography variant="body2" darkMode={darkMode} className="text-yellow-800 dark:text-yellow-200">
                Revisar la dependencia de proveedores externos para proyectos críticos.
              </MaterialTypography>
            </div>
          </div>
        </MaterialCard.Content>
      </MaterialCard>
    </div>
  );
};

export default ExecutiveReport;
