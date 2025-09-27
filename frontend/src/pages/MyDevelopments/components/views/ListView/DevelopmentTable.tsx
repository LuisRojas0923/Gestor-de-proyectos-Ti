import React from 'react';
import { Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { DevelopmentWithCurrentStatus } from '../../../../../types';
import { UseFiltersReturn } from '../../../hooks';

interface DevelopmentTableProps {
  groupedDevelopments: { [key: string]: DevelopmentWithCurrentStatus[] };
  groupBy: 'none' | 'provider' | 'module' | 'responsible';
  filters: UseFiltersReturn;
  darkMode: boolean;
  onViewDetails: (dev: DevelopmentWithCurrentStatus) => void;
  getStatusColor: (status: string) => string;
  getProgressColor: (stageName: string) => string;
}

export const DevelopmentTable: React.FC<DevelopmentTableProps> = ({
  groupedDevelopments,
  groupBy,
  filters,
  darkMode,
  onViewDetails,
  getStatusColor,
  getProgressColor,
}) => {
  const { sortField, sortDirection, handleSort } = filters;

  return (
    <div className="hidden lg:block space-y-6">
      {Object.entries(groupedDevelopments).map(([groupName, groupDevelopments]) => (
        <div key={groupName} className="space-y-3">
          {/* Header del grupo */}
          {groupBy !== 'none' && (
            <div className={`${darkMode ? 'bg-neutral-700' : 'bg-neutral-100'} rounded-lg p-3`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {groupName} ({groupDevelopments.length} desarrollos)
              </h3>
            </div>
          )}
          
          <div className={`${
            darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
          } border rounded-xl overflow-hidden`}>
            <table className="w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className={darkMode ? 'bg-neutral-800' : 'bg-neutral-50'}>
                <tr>
                  {[
                    { key: 'id', label: 'ID Remedy', width: 'w-32' },
                    { key: 'name', label: 'Nombre Desarrollo', width: 'w-80' },
                    { key: 'provider', label: 'Proveedor', width: 'w-24' },
                    { key: 'responsible', label: 'Responsable', width: 'w-40' },
                    { key: 'general_status', label: 'Estado', width: 'w-24' },
                    { key: 'current_stage', label: 'Progreso', width: 'w-32' },
                    { key: 'actions', label: 'Acciones', width: 'w-20' }
                  ].map(({ key, label, width }) => (
                    <th key={key} scope="col" className={`${width} px-2 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider`}>
                      {key === 'actions' ? (
                        label
                      ) : (
                        <button
                          onClick={() => handleSort(key as keyof DevelopmentWithCurrentStatus)}
                          className="flex items-center space-x-1 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                        >
                          <span>{label}</span>
                          <div className="flex flex-col">
                            <ChevronUp 
                              size={12} 
                              className={`${
                                sortField === key && sortDirection === 'asc' 
                                  ? 'text-primary-500' 
                                  : 'text-neutral-400'
                              }`} 
                            />
                            <ChevronDown 
                              size={12} 
                              className={`${
                                sortField === key && sortDirection === 'desc' 
                                  ? 'text-primary-500' 
                                  : 'text-neutral-400'
                              }`} 
                            />
                          </div>
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {groupDevelopments.map((dev) => (
                  <tr key={dev.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                    <td className="w-32 px-2 py-2 whitespace-nowrap text-xs font-medium text-primary-500 dark:text-primary-400">{dev.id}</td>
                    <td className={`w-80 px-2 py-2 text-xs font-medium ${darkMode ? 'text-white' : 'text-neutral-900'} truncate`} title={dev.name}>{dev.name}</td>
                    <td className={`w-24 px-2 py-2 whitespace-nowrap text-xs ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.provider || 'N/A'}</td>
                    <td className={`w-40 px-2 py-2 text-xs ${darkMode ? 'text-neutral-300' : 'text-neutral-600'} truncate`} title={dev.responsible || 'N/A'}>{dev.responsible || 'N/A'}</td>
                    <td className="w-24 px-2 py-2 whitespace-nowrap text-xs">
                      <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusColor(dev.general_status)}`}>
                        {dev.general_status}
                      </span>
                    </td>
                    <td className="w-32 px-2 py-2 text-xs">
                      <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full truncate ${getProgressColor(typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage || 'N/A')}`} title={typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage}>
                        {typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage}
                      </span>
                    </td>
                    <td className="w-20 px-2 py-2 whitespace-nowrap text-xs font-medium">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => {
                            console.log('Button clicked for:', dev.id);
                            onViewDetails(dev);
                          }} 
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 bg-blue-100 dark:bg-blue-900 p-1 rounded"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
