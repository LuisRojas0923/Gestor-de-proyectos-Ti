import {
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  Users
} from 'lucide-react';
import React from 'react';
import { DevelopmentCycleFlow, DevelopmentWithCurrentStatus } from '../../types';
import { Title, Text, MaterialCard } from '../atoms';

interface DevelopmentTimelineProps {
  cycleFlow: DevelopmentCycleFlow[];
  currentDevelopment?: DevelopmentWithCurrentStatus;
  showMilestonesOnly?: boolean;
}

const DevelopmentTimeline: React.FC<DevelopmentTimelineProps> = ({
  cycleFlow,
  currentDevelopment,
  showMilestonesOnly = false
}) => {
  const getStageStatus = (stageId: number) => {
    if (!currentDevelopment) return 'pending';

    if (currentDevelopment.current_stage_id === stageId) {
      return 'current';
    } else if (currentDevelopment.current_stage_id && currentDevelopment.current_stage_id > stageId) {
      return 'completed';
    } else {
      return 'pending';
    }
  };

  const getStatusIcon = (status: string, isMilestone: boolean) => {
    if (isMilestone) {
      switch (status) {
        case 'completed':
          return <CheckCircle size={20} className="text-green-500" />;
        case 'current':
          return <Clock size={20} className="text-blue-500" />;
        default:
          return <Circle size={20} className="text-gray-400" />;
      }
    } else {
      switch (status) {
        case 'completed':
          return <CheckCircle size={16} className="text-green-500" />;
        case 'current':
          return <Clock size={16} className="text-blue-500" />;
        default:
          return <Circle size={16} className="text-gray-400" />;
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'current':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600';
    }
  };

  const getPhaseColor = (phaseName: string) => {
    switch (phaseName) {
      case 'En Ejecución':
        return 'bg-blue-500';
      case 'En Espera':
        return 'bg-yellow-500';
      case 'Finales / Otros':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredStages = showMilestonesOnly
    ? cycleFlow.filter(stage => stage.is_milestone)
    : cycleFlow;

  // Agrupar por fases
  const phases = filteredStages.reduce((acc, stage) => {
    if (!acc[stage.phase_id]) {
      acc[stage.phase_id] = {
        phase_name: stage.phase_name,
        phase_color: stage.phase_color,
        stages: []
      };
    }
    acc[stage.phase_id].stages.push(stage);
    return acc;
  }, {} as Record<number, { phase_name: string; phase_color?: string; stages: DevelopmentCycleFlow[] }>);

  return (
    <MaterialCard elevation={1}>
      <MaterialCard.Content>
        <div className="flex items-center justify-between mb-6">
          <Title variant="h5">
            Timeline del Desarrollo
          </Title>
          {currentDevelopment && (
            <Text variant="body2" color="text-secondary">
              {currentDevelopment.current_stage?.stage_name || 'Etapa no definida'}
            </Text>
          )}
        </div>

        <div className="space-y-8">
          {Object.entries(phases).map(([phaseId, phaseData]) => (
            <div key={phaseId} className="relative">
              {/* Encabezado de Fase */}
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-4 h-4 rounded-full ${getPhaseColor(phaseData.phase_name)}`}></div>
                <Title variant="h6">
                  {phaseData.phase_name}
                </Title>
              </div>

              {/* Timeline de Etapas */}
              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>

                <div className="space-y-6">
                  {phaseData.stages.map((stage, index) => {
                    const status = getStageStatus(stage.stage_id);
                    const isLast = index === phaseData.stages.length - 1;

                    return (
                      <div key={stage.stage_id} className="relative flex items-start space-x-4">
                        {/* Icono de estado */}
                        <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getStatusColor(status)}`}>
                          {getStatusIcon(status, stage.is_milestone)}
                        </div>

                        {/* Contenido de la etapa */}
                        <div className={`flex-1 pb-6 ${!isLast ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                          <div className="flex items-center space-x-2 mb-2">
                            <Text variant="body2" weight="medium" color="text-primary" as="span">
                              {stage.stage_name}
                            </Text>
                            {stage.is_milestone && (
                              <Text variant="caption" weight="bold" className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-900/20 dark:text-yellow-400" as="span">
                                Hito
                              </Text>
                            )}
                            <Text variant="body2" color="text-secondary" as="span">
                              (Etapa {stage.stage_code})
                            </Text>
                          </div>

                          {stage.stage_description && (
                            <Text variant="body2" color="text-secondary" className="mb-3">
                              {stage.stage_description}
                            </Text>
                          )}

                          {/* Información adicional */}
                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <Users size={12} className="text-gray-500" />
                              <Text variant="caption" color="gray" as="span">
                                {stage.responsible_party_name}
                              </Text>
                            </div>

                            {stage.estimated_days && (
                              <div className="flex items-center space-x-1">
                                <Calendar size={12} className="text-gray-500" />
                                <Text variant="caption" color="gray" as="span">
                                  {stage.estimated_days} días
                                </Text>
                              </div>
                            )}

                            {/* Indicador de progreso para etapa actual */}
                            {status === 'current' && currentDevelopment?.stage_progress_percentage && (
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                                  {(() => {
                                    const stageProgressStyle = { width: `${currentDevelopment.stage_progress_percentage}%` };
                                    return (
                                      <Text
                                        as="div"
                                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                        style={stageProgressStyle}
                                      >
                                        &nbsp;
                                      </Text>
                                    );
                                  })()}
                                </div>
                                <Text variant="caption" color="gray" as="span">
                                  {currentDevelopment.stage_progress_percentage}%
                                </Text>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Title variant="h6" className="mb-3">
            Leyenda
          </Title>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle size={14} className="text-green-500" />
              <Text variant="caption" color="text-secondary" as="span">Completada</Text>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={14} className="text-blue-500" />
              <Text variant="caption" color="text-secondary" as="span">En Progreso</Text>
            </div>
            <div className="flex items-center space-x-2">
              <Circle size={14} className="text-gray-400" />
              <Text variant="caption" color="text-secondary" as="span">Pendiente</Text>
            </div>
            <div className="flex items-center space-x-2">
              <Text variant="caption" weight="bold" className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-900/20 dark:text-yellow-400" as="span">
                Hito
              </Text>
              <Text variant="caption" color="text-secondary" as="span">Etapa Crítica</Text>
            </div>
          </div>
        </div>
      </MaterialCard.Content>
    </MaterialCard>
  );
};

export default DevelopmentTimeline;
