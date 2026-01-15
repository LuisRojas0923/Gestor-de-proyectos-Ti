import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, RefreshCw } from 'lucide-react';
import {
  MaterialCard,
  MaterialButton,
  MaterialTypography,
  Spinner
} from '../../../components/atoms';
import { usePortalReport } from '../hooks/usePortalReport';
import { useVisibleColumns } from './useVisibleColumns';
import PortalSummary from './PortalSummary';
import PortalTableDesktop from './PortalTableDesktop';
import PortalCardsMobile from './PortalCardsMobile';
import PortalActions from './PortalActions';

const PortalReport: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const navigate = useNavigate();

  const {
    data: portalReportData,
    loading: portalReportLoading,
    error: portalReportError,
    refreshReport
  } = usePortalReport();

  const { visibleColumns } = useVisibleColumns();

  const handleExport = (format: 'pdf' | 'excel') => {
    console.log(`Exportando reporte del Portal en formato ${format}`);
    // TODO: Implementar exportación real
  };

  const handleRowDoubleClick = (portalId: number) => {
    // Navegar al detalle del desarrollo con la pestaña de bitácora
    navigate(`/developments/${portalId.toString().padStart(12, '0')}?tab=bitacora`);
  };

  if (portalReportLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <MaterialTypography variant="h6" darkMode={darkMode} className="mt-4">
            Cargando informe del Portal...
          </MaterialTypography>
        </div>
      </div>
    );
  }

  if (portalReportError) {
    return (
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Content>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <MaterialTypography variant="h6" darkMode={darkMode} className="text-red-600 dark:text-red-400 mb-2">
              Error al cargar el informe
            </MaterialTypography>
            <MaterialTypography variant="body2" darkMode={darkMode} className="text-red-500 dark:text-red-400">
              {portalReportError}
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
                Informe Detallado de Casos del Portal
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
            Informe detallado de todos los casos del Portal reportados en la herramienta con análisis completo de estado, progreso y métricas.
          </MaterialTypography>
        </MaterialCard.Header>
      </MaterialCard>

      {/* Resumen Ejecutivo */}
      {portalReportData?.summary && (
        <PortalSummary
          darkMode={darkMode}
          summary={portalReportData.summary}
        />
      )}

      {/* Tabla Detallada de Casos */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Content>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Vista de escritorio - Tabla completa */}
              <PortalTableDesktop
                darkMode={darkMode}
                cases={portalReportData?.cases || []}
                visibleColumns={visibleColumns}
                onRowDoubleClick={handleRowDoubleClick}
              />

              {/* Vista móvil - Cards responsivas */}
              <PortalCardsMobile
                darkMode={darkMode}
                cases={portalReportData?.cases || []}
                visibleColumns={visibleColumns}
                onRowDoubleClick={handleRowDoubleClick}
              />
            </div>
          </div>
        </MaterialCard.Content>
      </MaterialCard>

      {/* Acciones del Informe */}
      <PortalActions
        darkMode={darkMode}
        loading={portalReportLoading}
        onRefresh={refreshReport}
        onExport={handleExport}
      />
    </div>
  );
};

export default PortalReport;
