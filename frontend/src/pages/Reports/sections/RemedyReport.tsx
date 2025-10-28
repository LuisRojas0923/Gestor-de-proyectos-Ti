import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { 
  MaterialCard, 
  MaterialButton, 
  MaterialTypography,
  Spinner
} from '../../../components/atoms';
import { useRemedyReport } from '../hooks/useRemedyReport';
import { useVisibleColumns } from './useVisibleColumns';
import RemedySummary from './RemedySummary';
import RemedyTableDesktop from './RemedyTableDesktop';
import RemedyCardsMobile from './RemedyCardsMobile';
import RemedyActions from './RemedyActions';

const RemedyReport: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const navigate = useNavigate();
  
  const { 
    data: remedyReportData, 
    loading: remedyReportLoading, 
    error: remedyReportError,
    refreshReport
  } = useRemedyReport();

  const { visibleColumns } = useVisibleColumns();

  const handleExport = (format: 'pdf' | 'excel') => {
    console.log(`Exportando reporte Remedy en formato ${format}`);
    // TODO: Implementar exportación real
  };

  const handleRowDoubleClick = (remedyId: number) => {
    // Navegar al detalle del desarrollo con la pestaña de bitácora
    navigate(`/developments/${remedyId.toString().padStart(12, '0')}?tab=bitacora`);
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

      {/* Resumen Ejecutivo */}
      {remedyReportData?.summary && (
        <RemedySummary 
          darkMode={darkMode} 
          summary={remedyReportData.summary} 
        />
      )}

      {/* Tabla Detallada de Casos */}
      <MaterialCard darkMode={darkMode}>
        <MaterialCard.Content>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Vista de escritorio - Tabla completa */}
              <RemedyTableDesktop
                darkMode={darkMode}
                cases={remedyReportData?.cases || []}
                visibleColumns={visibleColumns}
                onRowDoubleClick={handleRowDoubleClick}
              />

              {/* Vista móvil - Cards responsivas */}
              <RemedyCardsMobile
                darkMode={darkMode}
                cases={remedyReportData?.cases || []}
                visibleColumns={visibleColumns}
                onRowDoubleClick={handleRowDoubleClick}
              />
            </div>
          </div>
        </MaterialCard.Content>
      </MaterialCard>

      {/* Acciones del Informe */}
      <RemedyActions
        darkMode={darkMode}
        loading={remedyReportLoading}
        onRefresh={refreshReport}
        onExport={handleExport}
      />
    </div>
  );
};

export default RemedyReport;
