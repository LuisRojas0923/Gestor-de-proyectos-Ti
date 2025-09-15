import {
    Calendar,
    CheckCircle,
    Circle,
    Clock,
    Users
} from 'lucide-react';
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { DevelopmentCycleFlow, DevelopmentWithCurrentStatus } from '../../types';

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
  const { state } = useAppContext();
  const { darkMode } = state;

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
    <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Timeline del Desarrollo
        </h3>
        {currentDevelopment && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {currentDevelopment.current_stage?.stage_name || 'Etapa no definida'}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {Object.entries(phases).map(([phaseId, phaseData]) => (
          <div key={phaseId} className="relative">
            {/* Encabezado de Fase */}
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-4 h-4 rounded-full ${getPhaseColor(phaseData.phase_name)}`}></div>
              <h4 className={`text-md font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {phaseData.phase_name}
              </h4>
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
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                            {stage.stage_name}
                          </span>
                          {stage.is_milestone && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-900/20 dark:text-yellow-400">
                              Hito
                            </span>
                          )}
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            (Etapa {stage.stage_code})
                          </span>
                        </div>
                        
                        {stage.stage_description && (
                          <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {stage.stage_description}
                          </p>
                        )}
                        
                        {/* Información adicional */}
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <div className="flex items-center space-x-1">
                            <Users size={12} className={darkMode ? 'text-gray-500' : 'text-gray-500'} />
                            <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                              {stage.responsible_party_name}
                            </span>
                          </div>
                          
                          {stage.estimated_days && (
                            <div className="flex items-center space-x-1">
                              <Calendar size={12} className={darkMode ? 'text-gray-500' : 'text-gray-500'} />
                              <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                                {stage.estimated_days} días
                              </span>
                            </div>
                          )}
                          
                          {/* Indicador de progreso para etapa actual */}
                          {status === 'current' && currentDevelopment?.stage_progress_percentage && (
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                <div 
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${currentDevelopment.stage_progress_percentage}%` }}
                                ></div>
                              </div>
                              <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                                {currentDevelopment.stage_progress_percentage}%
                              </span>
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
        <h5 className={`text-sm font-medium mb-3 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Leyenda
        </h5>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle size={14} className="text-green-500" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Completada</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock size={14} className="text-blue-500" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>En Progreso</span>
          </div>
          <div className="flex items-center space-x-2">
            <Circle size={14} className="text-gray-400" />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Pendiente</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full dark:bg-yellow-900/20 dark:text-yellow-400">
              Hito
            </span>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Etapa Crítica</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentTimeline;
