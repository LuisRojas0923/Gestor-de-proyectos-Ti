import { Eye } from 'lucide-react';
import { Button } from '../../atoms';
import { DevelopmentWithCurrentStatus } from '../../../types';

interface DevelopmentCardsProps {
  groupedDevelopments: { [key: string]: DevelopmentWithCurrentStatus[] };
  groupBy: 'none' | 'provider' | 'module' | 'responsible' | 'stage';
  darkMode: boolean;
  onViewDetails: (dev: DevelopmentWithCurrentStatus) => void;
  getStatusColor: (status: string) => string;
}

export const DevelopmentCards: React.FC<DevelopmentCardsProps> = ({
  groupedDevelopments,
  groupBy,
  darkMode,
  onViewDetails,
  getStatusColor,
}) => {
  return (
    <div className="lg:hidden space-y-6">
      {Object.entries(groupedDevelopments).map(([groupName, groupDevelopments]) => (
        <div key={groupName} className="space-y-4">
          {/* Header del grupo */}
          {groupBy !== 'none' && (
            <div className={`${darkMode ? 'bg-neutral-700' : 'bg-neutral-100'} rounded-lg p-3`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {groupName} ({groupDevelopments.length} desarrollos)
              </h3>
            </div>
          )}

          {groupDevelopments.map((dev) => (
            <div key={dev.id} className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
              } border rounded-xl p-4 hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                    {dev.name}
                  </h3>
                  <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">{dev.id}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={() => onViewDetails(dev)}
                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {""}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className={`font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>Responsable:</span>
                  <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} mt-1`}>{dev.responsible || 'N/A'}</p>
                </div>
                <div>
                  <span className={`font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>Proveedor:</span>
                  <p className={`${darkMode ? 'text-neutral-300' : 'text-neutral-700'} mt-1`}>{dev.provider || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(dev.general_status)}`}>
                  {dev.general_status}
                </span>
                <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
