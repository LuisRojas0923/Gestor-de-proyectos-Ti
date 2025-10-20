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

const QualityReport: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {

  const controlComplianceData = [
    { name: 'C003-GT', cumplido: 95, total: 100 },
    { name: 'C021-GT', cumplido: 88, total: 100 },
    { name: 'C004-GT', cumplido: 92, total: 100 },
    { name: 'C027-GT', cumplido: 85, total: 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <MaterialTypography variant="h5" darkMode={darkMode}>
              🛡️ Reporte de Calidad y Controles
            </MaterialTypography>
          </div>
          <MaterialTypography variant="body2" darkMode={darkMode} className="mt-2">
            Análisis de cumplimiento de controles de calidad y métricas de calidad del software.
          </MaterialTypography>
        </MaterialCard.Header>
      </MaterialCard>

      {/* Métricas de Calidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MaterialCard darkMode={darkMode} className="bg-green-50 dark:bg-green-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-green-600 dark:text-green-400">
                  Controles Ejecutados
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-green-900 dark:text-green-100">
                  45
                </MaterialTypography>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard darkMode={darkMode} className="bg-blue-50 dark:bg-blue-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-blue-600 dark:text-blue-400">
                  Cumplimiento Promedio
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-blue-900 dark:text-blue-100">
                  90%
                </MaterialTypography>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>

        <MaterialCard darkMode={darkMode} className="bg-yellow-50 dark:bg-yellow-900/20">
          <MaterialCard.Content>
            <div className="flex items-center justify-between">
              <div>
                <MaterialTypography variant="body2" darkMode={darkMode} className="text-yellow-600 dark:text-yellow-400">
                  No Conformidades
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
                  Tiempo Promedio QA
                </MaterialTypography>
                <MaterialTypography variant="h4" darkMode={darkMode} className="text-purple-900 dark:text-purple-100">
                  1.2d
                </MaterialTypography>
              </div>
              <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </MaterialCard.Content>
        </MaterialCard>
      </div>

      {/* Gráfico de Cumplimiento de Controles */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <MaterialTypography variant="h6" darkMode={darkMode}>
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
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Header>
          <MaterialTypography variant="h6" darkMode={darkMode}>
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
                      <MaterialTypography variant="h6" darkMode={darkMode}>
                        Implementando integración con API
                      </MaterialTypography>
                      <MaterialTypography variant="body2" darkMode={darkMode}>
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
