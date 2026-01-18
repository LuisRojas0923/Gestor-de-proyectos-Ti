import React from 'react';
import { FileText } from 'lucide-react';
import { Title, Text, Icon } from '../../../components/atoms';
import { VisibleColumnsConfig } from './useVisibleColumns';

interface PortalCaseDetail {
  portal_id: number;
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

interface PortalCardsMobileProps {
  cases: PortalCaseDetail[];
  visibleColumns: VisibleColumnsConfig;
  onRowDoubleClick: (portalId: number) => void;
}

const PortalCardsMobile: React.FC<PortalCardsMobileProps> = ({
  cases,
  visibleColumns,
  onRowDoubleClick
}) => {
  return (
    <div className="lg:hidden space-y-4">
      {cases && cases.length > 0 ? (
        cases.map((caseItem) => (
          <div
            key={caseItem.portal_id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onDoubleClick={() => onRowDoubleClick(caseItem.portal_id)}
            title="Doble click para ver detalles del desarrollo"
          >
            <div className="space-y-3">
              {/* ID y Nombre en la parte superior */}
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Text variant="caption" weight="medium" color="text-secondary">ID:</Text>
                    <Text variant="body2" weight="bold" color="text-primary">
                      {caseItem.portal_id}
                    </Text>
                  </div>
                  <Title variant="h6" weight="medium" className="truncate">
                    {caseItem.name}
                  </Title>
                </div>
              </div>

              {/* Información en grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleColumns.proveedor && (
                  <div>
                    <Text variant="caption" weight="medium" color="text-secondary">Proveedor:</Text>
                    <div className="mt-1">
                      <Text
                        as="span"
                        variant="caption"
                        weight="medium"
                        className={`inline-flex items-center px-2 py-1 rounded-full ${caseItem.provider?.includes('Ingesoft') ?
                          'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}
                      >
                        {caseItem.provider || 'N/A'}
                      </Text>
                    </div>
                  </div>
                )}

                {visibleColumns.etapa && (
                  <div>
                    <Text variant="caption" weight="medium" color="text-secondary">Etapa:</Text>
                    <div className="mt-1">
                      <Text
                        as="span"
                        variant="caption"
                        weight="medium"
                        className={`inline-flex items-center px-2 py-1 rounded-full ${caseItem.last_activity?.stage_name?.includes('Aprobación') ?
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          caseItem.last_activity?.stage_name?.includes('Pruebas') ?
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            caseItem.last_activity?.stage_name?.includes('Plan') ?
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}
                      >
                        {caseItem.last_activity?.stage_name || 'N/A'}
                      </Text>
                    </div>
                  </div>
                )}

                {visibleColumns.fecha_inicio && (
                  <div>
                    <Text variant="caption" weight="medium" color="text-secondary">Fecha Inicio:</Text>
                    <Text variant="body2" className="mt-1">
                      {caseItem.important_dates.created_at
                        ? new Date(caseItem.important_dates.created_at).toLocaleDateString()
                        : 'N/A'
                      }
                    </Text>
                  </div>
                )}

                {visibleColumns.fecha_fin && (
                  <div>
                    <Text variant="caption" weight="medium" color="text-secondary">Fecha Fin:</Text>
                    <Text variant="body2" className="mt-1">
                      {caseItem.important_dates.updated_at
                        ? new Date(caseItem.important_dates.updated_at).toLocaleDateString()
                        : 'N/A'
                      }
                    </Text>
                  </div>
                )}

                {visibleColumns.actor && (
                  <div>
                    <Text variant="caption" weight="medium" color="text-secondary">Actor:</Text>
                    <div className="mt-1">
                      <Text
                        as="span"
                        variant="caption"
                        weight="medium"
                        className={`inline-flex items-center px-2 py-1 rounded-full ${caseItem.last_activity?.actor_type?.includes('equipo_interno') ?
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          caseItem.last_activity?.actor_type?.includes('usuario') ?
                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}
                      >
                        {caseItem.last_activity?.actor_type || 'N/A'}
                      </Text>
                    </div>
                  </div>
                )}

                {visibleColumns.notas && (
                  <div className="sm:col-span-2">
                    <Text variant="caption" weight="medium" color="text-secondary">Notas:</Text>
                    <Text variant="body2" className="mt-1 line-clamp-2">
                      {caseItem.last_activity?.notes || 'Sin notas'}
                    </Text>
                  </div>
                )}
              </div>

              {/* Indicador de doble click */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <Text variant="caption" align="center" color="text-secondary">
                  💡 Doble click para ver detalles
                </Text>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center space-y-2">
            <Icon name={FileText} size="xl" className="text-gray-400" />
            <Title variant="h6">
              No hay casos encontrados
            </Title>
            <Text variant="body2" color="text-secondary">
              No se encontraron casos del Portal con los filtros aplicados
            </Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalCardsMobile;
