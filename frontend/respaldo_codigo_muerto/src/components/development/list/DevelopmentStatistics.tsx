import React from 'react';
import { Title, Text } from '../../atoms';
import { DevelopmentWithCurrentStatus } from '../../../types';

interface DevelopmentStatisticsProps {
  groupedDevelopments: { [key: string]: DevelopmentWithCurrentStatus[] };
  groupBy: 'none' | 'provider' | 'module' | 'responsible' | 'stage';
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
      case 'stage': return 'Etapa';
      default: return '';
    }
  };

  return (
    <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
      } border rounded-xl p-6`}>
      <Title variant="h5" weight="bold" className="mb-4">
        Estadísticas por {getGroupLabel()}
      </Title>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedDevelopments).map(([groupName, groupDevelopments]) => {
          const statusCounts = groupDevelopments.reduce((acc, dev) => {
            acc[dev.general_status] = (acc[dev.general_status] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number });

          return (
            <div key={groupName} className={`${darkMode ? 'bg-neutral-700' : 'bg-neutral-50'
              } rounded-lg p-4`}>
              <Title variant="h6" weight="medium" className="mb-2">
                {groupName}
              </Title>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Text variant="body2" color="text-secondary">Total:</Text>
                  <Text variant="body2" weight="bold" color="text-primary">
                    {groupDevelopments.length}
                  </Text>
                </div>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <Text variant="body2" color="text-secondary">{status}:</Text>
                    <Text variant="body2" weight="bold" color="text-primary">
                      {count}
                    </Text>
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
