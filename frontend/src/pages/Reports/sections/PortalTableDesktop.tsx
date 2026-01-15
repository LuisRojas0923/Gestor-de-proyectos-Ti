import React from 'react';
import { FileText } from 'lucide-react';
import { MaterialTypography } from '../../../components/atoms';
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
  darkMode: boolean;
  cases: PortalCaseDetail[];
  visibleColumns: VisibleColumnsConfig;
  onRowDoubleClick: (portalId: number) => void;
}

const PortalTableDesktop: React.FC<PortalTableDesktopProps> = ({
  darkMode,
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
                      <span className="font-medium text-gray-900 dark:text-white">
                        {caseItem.portal_id}
                      </span>
                    </div>
                  </td>
                )}

                {visibleColumns.nombre_desarrollo && (
                  <td className="px-4 py-3 text-sm">
                    <div className="max-w-xs">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {caseItem.name}
                      </p>
                    </div>
                  </td>
                )}

                {visibleColumns.proveedor && (
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${caseItem.provider?.includes('Ingesoft') ?
                      'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                      {caseItem.provider || 'N/A'}
                    </span>
                  </td>
                )}

                {visibleColumns.etapa && (
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${caseItem.last_activity?.stage_name?.includes('Aprobación') ?
                      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      caseItem.last_activity?.stage_name?.includes('Pruebas') ?
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                        caseItem.last_activity?.stage_name?.includes('Plan') ?
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                      {caseItem.last_activity?.stage_name || 'N/A'}
                    </span>
                  </td>
                )}

                {visibleColumns.tipo_actividad && (
                  <td className="px-4 py-3 text-sm">
                    <span className="text-gray-900 dark:text-white">
                      {caseItem.last_activity?.activity_type || 'N/A'}
                    </span>
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
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${caseItem.general_status === 'en_curso' ?
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      caseItem.general_status === 'completado' ?
                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                      {caseItem.general_status || 'N/A'}
                    </span>
                  </td>
                )}

                {visibleColumns.actor && (
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${caseItem.last_activity?.actor_type?.includes('equipo_interno') ?
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                      caseItem.last_activity?.actor_type?.includes('usuario') ?
                        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                      {caseItem.last_activity?.actor_type || 'N/A'}
                    </span>
                  </td>
                )}

                {visibleColumns.notas && (
                  <td className="px-4 py-3 text-sm">
                    <div className="max-w-xs">
                      <p className="text-gray-900 dark:text-white truncate">
                        {caseItem.last_activity?.notes || 'Sin notas'}
                      </p>
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="h-12 w-12 text-gray-400" />
                  <MaterialTypography variant="h6" darkMode={darkMode}>
                    No hay casos encontrados
                  </MaterialTypography>
                  <MaterialTypography variant="body2" darkMode={darkMode}>
                    No se encontraron casos del Portal con los filtros aplicados
                  </MaterialTypography>
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
