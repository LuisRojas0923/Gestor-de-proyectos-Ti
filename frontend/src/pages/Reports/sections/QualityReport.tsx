import React from 'react';
import { Shield, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  MaterialCard,
  MaterialTypography
} from '../../../components/atoms';

const QualityReport: React.FC<{ darkMode?: boolean }> = ({ darkMode }) => {

  const controlComplianceData = [
    { name: 'C003-GT', cumplido: 95, total: 100 },
    { name: 'C021-GT', cumplido: 88, total: 100 },
    { name: 'C004-GT', cumplido: 92, total: 100 },
    { name: 'C027-GT', cumplido: 85, total: 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <MaterialCard>
        <MaterialCard.Header>
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-[var(--color-primary)]" />
            <MaterialTypography variant="h5">
              Reporte de Calidad y Controles
            </MaterialTypography>
          </div>
          <MaterialTypography variant="body2" className="mt-2 text-[var(--color-text-secondary)]">
            Análisis de cumplimiento de controles de calidad y métricas de calidad del software.
          </MaterialTypography>
        </MaterialCard.Header>
      </MaterialCard>

      {/* Métricas de Calidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MaterialCard className="bg-[var(--color-surface-variant)]">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" className="text-[var(--color-primary)]">
                  Controles Ejecutados
                </MaterialTypography>
                <MaterialTypography variant="h4" className="text-[var(--color-text-primary)]">
                  45
                </MaterialTypography>
              </div>
              <CheckCircle className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard className="bg-[var(--color-surface-variant)]">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" className="text-[var(--color-primary)]">
                  Cumplimiento Promedio
                </MaterialTypography>
                <MaterialTypography variant="h4" className="text-[var(--color-text-primary)]">
                  90%
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
                <MaterialTypography variant="body2" className="text-[var(--color-tertiary)]">
                  No Conformidades
                </MaterialTypography>
                <MaterialTypography variant="h4" className="text-[var(--color-text-primary)]">
                  3
                </MaterialTypography>
              </div>
              <AlertTriangle className="h-8 w-8 text-[var(--color-tertiary)]" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard className="bg-[var(--color-surface-variant)]">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" className="text-[var(--color-secondary)]">
                  Tiempo Promedio QA
                </MaterialTypography>
                <MaterialTypography variant="h4" className="text-[var(--color-text-primary)]">
                  1.2d
                </MaterialTypography>
              </div>
              <Shield className="h-8 w-8 text-[var(--color-secondary)]" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>
      </div>

      {/* Gráfico de Cumplimiento de Controles */}
      <MaterialCard>
        <MaterialCard.Header>
          <MaterialTypography variant="h6">
            Cumplimiento de Controles por Tipo
          </MaterialTypography>
        </MaterialCard.Header>
        <MaterialCard.Content>
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
        </MaterialCard.Content>
      </MaterialCard>

      {/* Detalle de Controles */}
      <MaterialCard>
        <MaterialCard.Header>
          <MaterialTypography variant="h6">
            Detalle de Controles de Calidad
          </MaterialTypography>
        </MaterialCard.Header>
        <MaterialCard.Content>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className={darkMode ? 'bg-neutral-700' : 'bg-neutral-50'}>
                <tr>
                  {['Control', 'Descripción', 'Cumplimiento', 'Última Ejecución', 'Responsable'].map(header => (
                    <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    <div className="flex flex-col items-center space-y-2">
                      <Shield className="h-12 w-12 text-neutral-400" />
                      <MaterialTypography variant="h6">
                        Implementando integración con API
                      </MaterialTypography>
                      <MaterialTypography variant="body2" className="text-[var(--color-text-secondary)]">
                        Los datos de controles se cargarán desde el backend
                      </MaterialTypography>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </MaterialCard.Content>
      </MaterialCard>
    </div>
  );
};

export default QualityReport;
