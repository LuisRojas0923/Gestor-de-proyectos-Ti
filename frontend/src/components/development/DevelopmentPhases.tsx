import {
    AlertTriangle,
    CheckCircle,
    ChevronRight,
    Clock,
    TrendingUp
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import {
    DevelopmentCycleFlow,
    DevelopmentPhase,
    DevelopmentStage,
    DevelopmentWithCurrentStatus
} from '../../types';

interface DevelopmentPhasesProps {
  developmentId?: string;
  showAllPhases?: boolean;
}

const DevelopmentPhases: React.FC<DevelopmentPhasesProps> = ({ 
  developmentId, 
  showAllPhases = true 
}) => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const { get } = useApi();

  const [phases, setPhases] = useState<DevelopmentPhase[]>([]);
  const [stages, setStages] = useState<DevelopmentStage[]>([]);
  const [cycleFlow, setCycleFlow] = useState<DevelopmentCycleFlow[]>([]);
  const [currentDevelopment, setCurrentDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar datos en paralelo
        const [phasesData, stagesData, cycleFlowData] = await Promise.all([
          get('/phases') as Promise<DevelopmentPhase[]>,
          get('/stages') as Promise<DevelopmentStage[]>,
          get('/stages/cycle-flow') as Promise<DevelopmentCycleFlow[]>
        ]);

        setPhases(phasesData || []);
        setStages(stagesData || []);
        setCycleFlow(cycleFlowData || []);

        // Si se especifica un desarrollo, cargar su estado actual
        if (developmentId) {
          const devData = await get(`/developments/${developmentId}`) as DevelopmentWithCurrentStatus;
          setCurrentDevelopment(devData);
        }

      } catch (err) {
        console.error('Error loading phases data:', err);
        setError('Error al cargar los datos de fases y etapas');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [developmentId, get]);

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

  const getPhaseIcon = (phaseName: string) => {
    switch (phaseName) {
      case 'En Ejecución':
        return TrendingUp;
      case 'En Espera':
        return Clock;
      case 'Finales / Otros':
        return CheckCircle;
      default:
        return AlertTriangle;
    }
  };

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

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'current':
        return 'bg-blue-500 text-white';
      case 'pending':
        return 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300';
      default:
        return 'bg-gray-300 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${darkMode ? 'bg-neutral-800 border-red-500' : 'bg-white border-red-500'} border rounded-xl p-6`}>
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Sistema de Fases y Etapas
        </h3>
        {currentDevelopment && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Progreso: {currentDevelopment.stage_progress_percentage || 0}%
          </div>
        )}
      </div>

      {/* Flujo del Ciclo Completo */}
      <div className="mb-8">
        <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Flujo del Ciclo de Desarrollo
        </h4>
        <div className="space-y-4">
          {cycleFlow.map((stage, index) => {
            const status = getStageStatus(stage.stage_id);
            const Icon = getPhaseIcon(stage.phase_name);
            
            return (
              <div key={stage.stage_id} className="flex items-center space-x-4">
                {/* Número de etapa */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getStageStatusColor(status)}`}>
                  {stage.stage_code}
                </div>
                
                {/* Información de la etapa */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Icon size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                      {stage.stage_name}
                    </span>
                    {stage.is_milestone && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Hito
                      </span>
                    )}
                  </div>
                  {stage.stage_description && (
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stage.stage_description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-1">
                    <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Responsable: {stage.responsible_party_name}
                    </span>
                    {stage.estimated_days && (
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {stage.estimated_days} días
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Indicador de progreso */}
                {status === 'current' && currentDevelopment?.stage_progress_percentage && (
                  <div className="w-20">
                    <div className="bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${currentDevelopment.stage_progress_percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400">
                      {currentDevelopment.stage_progress_percentage}%
                    </div>
                  </div>
                )}
                
                {/* Flecha de conexión */}
                {index < cycleFlow.length - 1 && (
                  <ChevronRight size={16} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen por Fases */}
      {showAllPhases && (
        <div>
          <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Resumen por Fases
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {phases.map((phase) => {
              const phaseStages = cycleFlow.filter(stage => stage.phase_id === phase.id);
              const completedStages = phaseStages.filter(stage => getStageStatus(stage.stage_id) === 'completed').length;
              const currentStages = phaseStages.filter(stage => getStageStatus(stage.stage_id) === 'current').length;
              const Icon = getPhaseIcon(phase.phase_name);
              
              return (
                <div key={phase.id} className={`${darkMode ? 'bg-neutral-700' : 'bg-gray-50'} rounded-lg p-4`}>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-3 h-3 rounded-full ${getPhaseColor(phase.phase_name)}`}></div>
                    <Icon size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                      {phase.phase_name}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Etapas:</span>
                      <span className={darkMode ? 'text-white' : 'text-neutral-900'}>
                        {completedStages + currentStages}/{phaseStages.length}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-600">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${phaseStages.length > 0 ? ((completedStages + currentStages) / phaseStages.length) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    
                    {phase.phase_description && (
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {phase.phase_description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Información del Desarrollo Actual */}
      {currentDevelopment && (
        <div className={`mt-6 p-4 ${darkMode ? 'bg-neutral-700' : 'bg-blue-50'} rounded-lg`}>
          <h5 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Estado Actual del Desarrollo
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Desarrollo:</span>
              <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {currentDevelopment.name}
              </span>
            </div>
            <div>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Fase Actual:</span>
              <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {currentDevelopment.current_phase?.phase_name || 'No definida'}
              </span>
            </div>
            <div>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Etapa Actual:</span>
              <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {currentDevelopment.current_stage?.stage_name || 'No definida'}
              </span>
            </div>
            <div>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Progreso:</span>
              <span className={`ml-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {currentDevelopment.stage_progress_percentage || 0}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevelopmentPhases;
