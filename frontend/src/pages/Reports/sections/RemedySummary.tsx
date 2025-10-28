import React from 'react';
import { CheckCircle, Clock, FileText } from 'lucide-react';
import { MaterialCard, MaterialTypography } from '../../../components/atoms';

interface RemedySummaryProps {
  darkMode: boolean;
  summary: {
    total_cases: number;
    status_distribution: Record<string, number>;
  };
}

const RemedySummary: React.FC<RemedySummaryProps> = ({ darkMode, summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MaterialCard darkMode={darkMode} className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <MaterialCard.Content>
          <div className="flex items-center justify-between">
            <div>
              <MaterialTypography variant="body2" darkMode={darkMode} className="text-blue-600 dark:text-blue-400">
                Total Casos
              </MaterialTypography>
              <MaterialTypography variant="h4" darkMode={darkMode} className="text-blue-900 dark:text-blue-100">
                {summary.total_cases || 0}
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
                {summary.status_distribution['completado'] || 0}
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
                {summary.status_distribution['en_progreso'] || 0}
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
                {summary.status_distribution['pendiente'] || 0}
              </MaterialTypography>
            </div>
            <Clock className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </MaterialCard.Content>
      </MaterialCard>
    </div>
  );
};

export default RemedySummary;
