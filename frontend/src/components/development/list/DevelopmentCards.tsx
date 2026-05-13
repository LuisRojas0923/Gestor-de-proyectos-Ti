import { Eye } from 'lucide-react';
import { Button, Title, Text, MaterialCard } from '../../atoms';
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
              <Title variant="h3" weight="semibold">
                {groupName} ({groupDevelopments.length} desarrollos)
              </Title>
            </div>
          )}

          {groupDevelopments.map((dev) => (
            <MaterialCard key={dev.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Title variant="h4" weight="medium">
                    {dev.name}
                  </Title>
                  <Text variant="caption" color="primary" className="mt-1">
                    {dev.id}
                  </Text>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={() => onViewDetails(dev)}
                  >
                    {""}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Text variant="caption" weight="medium" color="secondary">
                    Responsable:
                  </Text>
                  <Text variant="body2" className="mt-1">
                    {dev.responsible || 'N/A'}
                  </Text>
                </div>
                <div>
                  <Text variant="caption" weight="medium" color="secondary">
                    Proveedor:
                  </Text>
                  <Text variant="body2" className="mt-1">
                    {dev.provider || 'N/A'}
                  </Text>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <Text
                  as="span"
                  variant="caption"
                  weight="semibold"
                  className={`px-2 py-1 inline-flex leading-5 rounded-full text-white ${getStatusColor(dev.general_status)}`}
                >
                  {dev.general_status}
                </Text>
                <Text variant="caption" color="secondary">
                  {typeof dev.current_stage === 'object' ? dev.current_stage?.stage_name || 'N/A' : dev.current_stage}
                </Text>
              </div>
            </MaterialCard>
          ))}
        </div>
      ))}
    </div>
  );
};
