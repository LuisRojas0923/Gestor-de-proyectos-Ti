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

interface PortalTableDesktopProps {
  cases: PortalCaseDetail[];
  visibleColumns: VisibleColumnsConfig;
  onRowDoubleClick: (portalId: number) => void;
}

const PortalTableDesktop: React.FC<PortalTableDesktopProps> = ({
  cases,
  visibleColumns,
  onRowDoubleClick
}) => {
  return (
    <div className="hidden lg:block">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {[
              { key: 'id_desarrollo', label: 'ID Desarrollo' },
              { key: 'nombre_desarrollo', label: 'Nombre Desarrollo' },
              { key: 'proveedor', label: 'Proveedor' },
              { key: 'etapa', label: 'Etapa' },
              { key: 'tipo_actividad', label: 'Tipo Actividad' },
              { key: 'fecha_inicio', label: 'Fecha Inicio' },
              { key: 'fecha_fin', label: 'Fecha Fin' },
              { key: 'estado', label: 'Estado' },
              { key: 'actor', label: 'Actor' },
              { key: 'notas', label: 'Notas' }
            ].filter(column => visibleColumns[column.key as keyof VisibleColumnsConfig]).map(column => (
              <th key={column.key} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {cases && cases.length > 0 ? (
            cases.map((caseItem) => (
              <tr
                key={caseItem.portal_id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                onDoubleClick={() => onRowDoubleClick(caseItem.portal_id)}
                title="Doble click para ver detalles del desarrollo"
              >
                {/* Renderizar solo las columnas visibles */}
                {visibleColumns.id_desarrollo && (
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Text variant="body2" weight="medium" color="text-primary">
                        {caseItem.portal_id}
                      </Text>
                    </div>
                  </td>
                )}

                {visibleColumns.nombre_desarrollo && (
                  <td className="px-4 py-3 text-sm">
                    <div className="max-w-xs">
                      <Text variant="body2" weight="medium" color="text-primary" className="truncate">
                        {caseItem.name}
                      </Text>
                    </div>
                  </td>
                )}

                {visibleColumns.proveedor && (
                  <td className="px-4 py-3 text-sm">
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
                  </td>
                )}

                {visibleColumns.etapa && (
                  <td className="px-4 py-3 text-sm">
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
                  </td>
                )}

                {visibleColumns.tipo_actividad && (
                  <td className="px-4 py-3 text-sm">
                    <Text variant="body2" color="text-primary">
                      {caseItem.last_activity?.activity_type || 'N/A'}
                    </Text>
                  </td>
                )}

                {visibleColumns.fecha_inicio && (
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {caseItem.important_dates.created_at
                      ? new Date(caseItem.important_dates.created_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </td>
                )}

                {visibleColumns.fecha_fin && (
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {caseItem.important_dates.updated_at
                      ? new Date(caseItem.important_dates.updated_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </td>
                )}

                {visibleColumns.estado && (
                  <td className="px-4 py-3 text-sm">
                    <Text
                      as="span"
                      variant="caption"
                      weight="medium"
                      className={`inline-flex items-center px-2 py-1 rounded-full ${caseItem.general_status === 'en_curso' ?
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        caseItem.general_status === 'completado' ?
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}
                    >
                      {caseItem.general_status || 'N/A'}
                    </Text>
                  </td>
                )}

                {visibleColumns.actor && (
                  <td className="px-4 py-3 text-sm">
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
                  </td>
                )}

                {visibleColumns.notas && (
                  <td className="px-4 py-3 text-sm">
                    <div className="max-w-xs">
                      <Text variant="body2" color="text-primary" className="truncate">
                        {caseItem.last_activity?.notes || 'Sin notas'}
                      </Text>
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <div className="flex flex-col items-center space-y-2">
                  <Icon name={FileText} size="xl" className="text-gray-400" />
                  <Title variant="h6">
                    No hay casos encontrados
                  </Title>
                  <Text variant="body2" color="text-secondary">
                    No se encontraron casos del Portal con los filtros aplicados
                  </Text>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PortalTableDesktop;
