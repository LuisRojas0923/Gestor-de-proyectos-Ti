import React from 'react';
import { DevelopmentWithCurrentStatus } from '../../../../../types';

interface DevelopmentStatisticsProps {
  groupedDevelopments: { [key: string]: DevelopmentWithCurrentStatus[] };
  groupBy: 'none' | 'provider' | 'module' | 'responsible';
  darkMode: boolean;
}

export const DevelopmentStatistics: React.FC<DevelopmentStatisticsProps> = ({
  groupedDevelopments,
  groupBy,
  darkMode,
}) => {
  if (groupBy === 'none') return null;

  const getGroupLabel = () => {
    switch (groupBy) {
      case 'provider': return 'Proveedor';
      case 'module': return 'Módulo';
      case 'responsible': return 'Responsable';
      default: return '';
    }
  };

  return (
    <div className={`${
      darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
    } border rounded-xl p-6`}>
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
        Estadísticas por {getGroupLabel()}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedDevelopments).map(([groupName, groupDevelopments]) => {
          const statusCounts = groupDevelopments.reduce((acc, dev) => {
            acc[dev.general_status] = (acc[dev.general_status] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number });

          return (
            <div key={groupName} className={`${
              darkMode ? 'bg-neutral-700' : 'bg-neutral-50'
            } rounded-lg p-4`}>
              <h4 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {groupName}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-neutral-300' : 'text-neutral-600'}>Total:</span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                    {groupDevelopments.length}
                  </span>
                </div>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className={darkMode ? 'text-neutral-300' : 'text-neutral-600'}>{status}:</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
