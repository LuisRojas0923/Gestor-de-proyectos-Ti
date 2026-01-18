import React from 'react';
import { FileText, Download, TrendingUp, Users, AlertTriangle, Target } from 'lucide-react';
import {
  MaterialCard,
  Button,
  MaterialTypography
} from '../../../components/atoms';

const ExecutiveReport: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => {

  const handleExport = () => {
    console.log('Exportando reporte ejecutivo...');
    // TODO: Implementar exportación real
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <MaterialCard>
        <MaterialCard.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-[var(--color-primary)]" />
              <MaterialTypography variant="h5">
                Reporte Ejecutivo Consolidado
              </MaterialTypography>
            </div>
            <Button
              variant="primary"
              icon={Download}
              onClick={handleExport}
            >
              Generar Reporte
            </Button>
          </div>
          <MaterialTypography variant="body2" className="mt-2 text-[var(--color-text-secondary)]">
            Resumen ejecutivo para directivos con métricas clave y análisis de tendencias.
          </MaterialTypography>
        </MaterialCard.Header>
      </MaterialCard>

      {/* Métricas Ejecutivas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MaterialCard className="bg-[var(--color-surface-variant)]">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" className="text-[var(--color-primary)]">
                  ROI del Proyecto
                </MaterialTypography>
                <MaterialTypography variant="h4" className="text-[var(--color-text-primary)]">
                  245%
                </MaterialTypography>
              </div>
              <TrendingUp className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard className="bg-[var(--color-surface-variant)]">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" className="text-[var(--color-text-secondary)]">
                  Eficiencia del Equipo
                </MaterialTypography>
                <MaterialTypography variant="h4" className="text-green-900 dark:text-green-100">
                  92%
                </MaterialTypography>
              </div>
              <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard className="bg-[var(--color-surface-variant)]">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" className="text-[var(--color-text-secondary)]">
                  Riesgos Activos
                </MaterialTypography>
                <MaterialTypography variant="h4" className="text-yellow-900 dark:text-yellow-100">
                  3
                </MaterialTypography>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard className="bg-[var(--color-surface-variant)]">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" className="text-purple-600 dark:text-purple-400">
                  Satisfacción Cliente
                </MaterialTypography>
                <MaterialTypography variant="h4" className="text-purple-900 dark:text-purple-100">
                  4.8/5
                </MaterialTypography>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>
      </div>

      {/* Tabla de Desarrollos para Directivos */}
      <MaterialCard>
        <MaterialCard.Header>
          <MaterialTypography variant="h6">
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
                      <MaterialTypography variant="h6">
                        Implementando integración con API
                      </MaterialTypography>
                      <MaterialTypography variant="body2" className="text-[var(--color-text-secondary)]">
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
      <MaterialCard>
        <MaterialCard.Header>
          <MaterialTypography variant="h6">
            Recomendaciones Estratégicas
          </MaterialTypography>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg bg-[var(--color-surface-variant)] border border-[var(--color-border)]`}>
              <MaterialTypography variant="subtitle1" className="text-[var(--color-primary)] mb-2 flex items-center">
                <Target size={18} className="mr-2" /> Optimización de Procesos
              </MaterialTypography>
              <MaterialTypography variant="body2" className="text-[var(--color-text-secondary)]">
                Implementar automatización en las etapas de testing para reducir el tiempo de ciclo en un 15%.
              </MaterialTypography>
            </div>

            <div className={`p-4 rounded-lg bg-[var(--color-surface-variant)] border border-[var(--color-border)]`}>
              <MaterialTypography variant="subtitle1" className="text-green-700 dark:text-green-300 mb-2 flex items-center">
                <TrendingUp size={18} className="mr-2" /> Expansión de Capacidad
              </MaterialTypography>
              <MaterialTypography variant="body2" className="text-[var(--color-text-secondary)]">
                Considerar la contratación de 2 desarrolladores adicionales para el próximo trimestre.
              </MaterialTypography>
            </div>

            <div className={`p-4 rounded-lg bg-[var(--color-surface-variant)] border border-[var(--color-border)]`}>
              <MaterialTypography variant="subtitle1" className="text-yellow-700 dark:text-yellow-300 mb-2 flex items-center">
                <AlertTriangle size={18} className="mr-2" /> Gestión de Riesgos
              </MaterialTypography>
              <MaterialTypography variant="body2" className="text-[var(--color-text-secondary)]">
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
