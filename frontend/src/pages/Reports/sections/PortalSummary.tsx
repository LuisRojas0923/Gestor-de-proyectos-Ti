import React from 'react';
import { CheckCircle, Clock, FileText } from 'lucide-react';
import { MaterialCard, MaterialTypography } from '../../../components/atoms';

interface PortalSummaryProps {
  summary: {
    total_cases: number;
    status_distribution: Record<string, number>;
  };
}

const PortalSummary: React.FC<PortalSummaryProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MaterialCard className="bg-[var(--color-surface-variant)] border-[var(--color-border)]">
        <MaterialCard.Content>
          <div className="flex items-center justify-between">
            <div>
              <MaterialTypography variant="body2" color="primary">
                Total Casos
              </MaterialTypography>
              <MaterialTypography variant="h4" color="primary">
                {summary.total_cases || 0}
              </MaterialTypography>
            </div>
            <FileText className="h-8 w-8 text-[var(--color-primary)]" />
          </div>
        </MaterialCard.Content>
      </MaterialCard>

      <MaterialCard className="bg-[var(--color-surface-variant)] border-[var(--color-border)]">
        <MaterialCard.Content>
          <div className="flex items-center justify-between">
            <div>
              <MaterialTypography variant="body2" color="success">
                Completados
              </MaterialTypography>
              <MaterialTypography variant="h4" color="success">
                {summary.status_distribution['completado'] || 0}
              </MaterialTypography>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </MaterialCard.Content>
      </MaterialCard>

      <MaterialCard className="bg-[var(--color-surface-variant)] border-[var(--color-border)]">
        <MaterialCard.Content>
          <div className="flex items-center justify-between">
            <div>
              <MaterialTypography variant="body2" color="warning">
                En Progreso
              </MaterialTypography>
              <MaterialTypography variant="h4" color="warning">
                {summary.status_distribution['en_progreso'] || 0}
              </MaterialTypography>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </MaterialCard.Content>
      </MaterialCard>

      <MaterialCard className="bg-[var(--color-surface-variant)] border-[var(--color-border)]">
        <MaterialCard.Content>
          <div className="flex items-center justify-between">
            <div>
              <MaterialTypography variant="body2" color="error">
                Pendientes
              </MaterialTypography>
              <MaterialTypography variant="h4" color="error">
                {summary.status_distribution['pendiente'] || 0}
              </MaterialTypography>
            </div>
            <Clock className="h-8 w-8 text-red-500" />
          </div>
        </MaterialCard.Content>
      </MaterialCard>
    </div>
  );
};

export default PortalSummary;
