import React from 'react';
import { FileText } from 'lucide-react';
import { MaterialTypography } from '../../../components/atoms';
import { VisibleColumnsConfig } from './useVisibleColumns';

interface RemedyCaseDetail {
  remedy_id: number;
  name: string;
  provider?: string;
  general_status: string;
  last_activity?: {
    stage_name?: string;
    activity_type?: string;
    notes?: string;
    actor_type?: string;
  };
  important_dates: {
    created_at?: string;
    updated_at?: string;
  };
}

interface RemedyCardsMobileProps {
  darkMode: boolean;
  cases: RemedyCaseDetail[];
  visibleColumns: VisibleColumnsConfig;
  onRowDoubleClick: (remedyId: number) => void;
}

const RemedyCardsMobile: React.FC<RemedyCardsMobileProps> = ({
  darkMode,
  cases,
  visibleColumns,
  onRowDoubleClick
}) => {
  return (
    <div className="lg:hidden space-y-4">
      {cases && cases.length > 0 ? (
        cases.map((caseItem) => (
          <div 
            key={caseItem.remedy_id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onDoubleClick={() => onRowDoubleClick(caseItem.remedy_id)}
            title="Doble click para ver detalles del desarrollo"
          >
            <div className="space-y-3">
              {/* ID y Nombre en la parte superior */}
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ID:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {caseItem.remedy_id}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {caseItem.name}
                  </h3>
                </div>
              </div>

              {/* Información en grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleColumns.proveedor && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Proveedor:</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        caseItem.provider?.includes('Ingesoft') ? 
                          'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {caseItem.provider || 'N/A'}
                      </span>
                    </div>
                  </div>
                )}

                {visibleColumns.etapa && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Etapa:</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        caseItem.last_activity?.stage_name?.includes('Aprobación') ? 
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        caseItem.last_activity?.stage_name?.includes('Pruebas') ? 
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                        caseItem.last_activity?.stage_name?.includes('Plan') ? 
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {caseItem.last_activity?.stage_name || 'N/A'}
                      </span>
                    </div>
                  </div>
                )}

                {visibleColumns.fecha_inicio && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha Inicio:</span>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {caseItem.important_dates.created_at 
                        ? new Date(caseItem.important_dates.created_at).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                )}

                {visibleColumns.fecha_fin && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha Fin:</span>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {caseItem.important_dates.updated_at 
                        ? new Date(caseItem.important_dates.updated_at).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                )}

                {visibleColumns.actor && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Actor:</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        (caseItem.last_activity as any)?.actor_type?.includes('equipo_interno') ? 
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                        (caseItem.last_activity as any)?.actor_type?.includes('usuario') ? 
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {(caseItem.last_activity as any)?.actor_type || 'N/A'}
                      </span>
                    </div>
                  </div>
                )}

                {visibleColumns.notas && (
                  <div className="sm:col-span-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Notas:</span>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white line-clamp-2">
                      {caseItem.last_activity?.notes || 'Sin notas'}
                    </p>
                  </div>
                )}
              </div>

              {/* Indicador de doble click */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  💡 Doble click para ver detalles
                </p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center space-y-2">
            <FileText className="h-12 w-12 text-gray-400" />
            <MaterialTypography variant="h6" darkMode={darkMode}>
              No hay casos encontrados
            </MaterialTypography>
            <MaterialTypography variant="body2" darkMode={darkMode}>
              No se encontraron casos Remedy con los filtros aplicados
            </MaterialTypography>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemedyCardsMobile;
