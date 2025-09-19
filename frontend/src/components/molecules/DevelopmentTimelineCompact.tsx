import React from 'react';
import { LucideIcon, TrendingUp, Clock, CheckCircle, XCircle, FileText, Code, TestTube, Shield, Rocket } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface DevelopmentStage {
  id: number;
  name: string;
  description: string;
  responsible: 'Usuario' | 'Proveedor' | 'Equipo Interno';
  status: 'completed' | 'current' | 'pending' | 'cancelled';
  icon: LucideIcon;
  phase: 'execution' | 'waiting' | 'final';
  estimatedDays?: number;
}

interface DevelopmentTimelineCompactProps {
  developmentId: string;
  currentStage?: number;
  darkMode?: boolean;
  onStageClick?: (stage: DevelopmentStage) => void;
  isCancelled?: boolean;
  onCancel?: () => void;
}

const DevelopmentTimelineCompact: React.FC<DevelopmentTimelineCompactProps> = ({
  developmentId,
  currentStage = 1,
  darkMode = false,
  onStageClick,
  isCancelled = false,
  onCancel
}) => {
  const { state } = useAppContext();
  const { darkMode: contextDarkMode } = state;
  const isDarkMode = darkMode ?? contextDarkMode;

  // Definir todas las etapas del desarrollo
  const stages: DevelopmentStage[] = [
    {
      id: 1,
      name: 'Definición',
      description: 'Definición de requerimientos',
      responsible: 'Usuario',
      status: currentStage >= 1 ? 'completed' : 'pending',
      icon: FileText,
      phase: 'execution',
      estimatedDays: 2
    },
    {
      id: 2,
      name: 'Análisis',
      description: 'Análisis técnico',
      responsible: 'Proveedor',
      status: currentStage >= 2 ? 'completed' : 'pending',
      icon: TrendingUp,
      phase: 'execution',
      estimatedDays: 3
    },
    {
      id: 3,
      name: 'Propuesta',
      description: 'Elaboración de propuesta comercial',
      responsible: 'Proveedor',
      status: currentStage >= 3 ? 'completed' : currentStage === 3 ? 'current' : 'pending',
      icon: Clock,
      phase: 'waiting',
      estimatedDays: 5
    },
    {
      id: 4,
      name: 'Aprobación',
      description: 'Aprobación de la propuesta',
      responsible: 'Usuario',
      status: currentStage >= 4 ? 'completed' : currentStage === 4 ? 'current' : 'pending',
      icon: Shield,
      phase: 'waiting',
      estimatedDays: 2
    },
    {
      id: 5,
      name: 'Desarrollo',
      description: 'Implementación del desarrollo',
      responsible: 'Proveedor',
      status: currentStage >= 5 ? 'completed' : currentStage === 5 ? 'current' : 'pending',
      icon: Code,
      phase: 'execution',
      estimatedDays: 15
    },
    {
      id: 6,
      name: 'Despliegue (Pruebas)',
      description: 'Despliegue en ambiente de pruebas',
      responsible: 'Proveedor',
      status: currentStage >= 6 ? 'completed' : currentStage === 6 ? 'current' : 'pending',
      icon: Rocket,
      phase: 'execution',
      estimatedDays: 2
    },
    {
      id: 7,
      name: 'Plan de Pruebas',
      description: 'Elaboración del plan de pruebas',
      responsible: 'Usuario',
      status: currentStage >= 7 ? 'completed' : currentStage === 7 ? 'current' : 'pending',
      icon: TestTube,
      phase: 'execution',
      estimatedDays: 3
    },
    {
      id: 8,
      name: 'Ejecución Pruebas',
      description: 'Ejecución de pruebas funcionales',
      responsible: 'Usuario',
      status: currentStage >= 8 ? 'completed' : currentStage === 8 ? 'current' : 'pending',
      icon: TestTube,
      phase: 'execution',
      estimatedDays: 5
    },
    {
      id: 9,
      name: 'Aprobación (Pase)',
      description: 'Aprobación para pase a producción',
      responsible: 'Usuario',
      status: currentStage >= 9 ? 'completed' : currentStage === 9 ? 'current' : 'pending',
      icon: Shield,
      phase: 'waiting',
      estimatedDays: 1
    },
    {
      id: 10,
      name: 'Desplegado',
      description: 'Desplegado en producción',
      responsible: 'Equipo Interno',
      status: currentStage >= 10 ? 'completed' : 'pending',
      icon: CheckCircle,
      phase: 'final',
      estimatedDays: 1
    }
  ];

  // Filtrar etapas por fase
  const executionStages = stages.filter(stage => stage.phase === 'execution');
  const waitingStages = stages.filter(stage => stage.phase === 'waiting');
  const finalStages = stages.filter(stage => stage.phase === 'final');

  // Calcular progreso por fase
  const getPhaseProgress = (phaseStages: DevelopmentStage[]) => {
    const completed = phaseStages.filter(stage => stage.status === 'completed').length;
    const total = phaseStages.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const executionProgress = getPhaseProgress(executionStages);
  const waitingProgress = getPhaseProgress(waitingStages);
  const finalProgress = getPhaseProgress(finalStages);

  // Calcular progreso general - corregir el cálculo NaN
  const totalProgress = isCancelled ? 0 : Math.round(((currentStage - 1) / 10) * 100);

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return isDarkMode ? 'bg-green-500' : 'bg-green-600';
      case 'current':
        return isDarkMode ? 'bg-blue-500' : 'bg-blue-600';
      case 'pending':
        return isDarkMode ? 'bg-gray-600' : 'bg-gray-300';
      case 'cancelled':
        return isDarkMode ? 'bg-red-500' : 'bg-red-600';
      default:
        return isDarkMode ? 'bg-gray-600' : 'bg-gray-300';
    }
  };

  const getStageTextColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'current':
        return 'text-blue-600 dark:text-blue-400';
      case 'pending':
        return isDarkMode ? 'text-gray-400' : 'text-gray-500';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400';
      default:
        return isDarkMode ? 'text-gray-400' : 'text-gray-500';
    }
  };

  const getConnectorColor = (currentStatus: string) => {
    if (currentStatus === 'completed') {
      return isDarkMode ? 'bg-green-500' : 'bg-green-600';
    }
    return isDarkMode ? 'bg-gray-600' : 'bg-gray-300';
  };

  const handleStageClick = (stage: DevelopmentStage) => {
    if (onStageClick) {
      onStageClick(stage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
          Sistema de Fases y Etapas
        </h3>
        <div className="flex items-center space-x-4">
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Progreso: {totalProgress}%
          </div>
          {!isCancelled && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors duration-200"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Timeline horizontal */}
      <div className="relative">
        {/* Línea de progreso principal */}
        <div className={`absolute top-8 left-0 right-0 h-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full`}>
          <div 
            className={`h-full ${isCancelled ? (isDarkMode ? 'bg-red-500' : 'bg-red-600') : (isDarkMode ? 'bg-blue-500' : 'bg-blue-600')} rounded-full transition-all duration-500`}
            style={{ width: `${totalProgress}%` }}
          />
        </div>

        {/* Rama de cancelación (paralela) */}
        {isCancelled && (
          <div className="absolute top-16 left-0 right-0">
            <div className="flex justify-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-500' : 'bg-red-600'} relative z-10`}>
                <XCircle size={20} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-red-600 text-white border-2 border-red-500">
                C
              </div>
              <div className="mt-20 text-center max-w-20">
                <h4 className={`text-xs font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  Cancelado
                </h4>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Sistema
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Etapas del timeline */}
        <div className={`flex justify-between items-start ${isCancelled ? 'pb-20' : 'pb-8'}`}>
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isLast = index === stages.length - 1;
            
            return (
              <div key={stage.id} className="flex flex-col items-center relative">
                {/* Conector hacia la derecha */}
                {!isLast && (
                  <div 
                    className={`absolute top-8 left-8 w-16 h-1 ${getConnectorColor(stage.status)}`}
                    style={{ zIndex: 1 }}
                  />
                )}

                {/* Círculo de la etapa */}
                <div 
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 ${getStageStatusColor(stage.status)}`}
                  onClick={() => handleStageClick(stage)}
                >
                  <Icon 
                    size={20} 
                    className={stage.status === 'completed' ? 'text-white' : stage.status === 'current' ? 'text-white' : isDarkMode ? 'text-gray-300' : 'text-gray-600'} 
                  />
                </div>

                {/* Número de etapa - mejorado posicionamiento */}
                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 ${getStageStatusColor(stage.status)} shadow-lg`}>
                  {stage.id}
                </div>

                {/* Información de la etapa */}
                <div className="mt-4 text-center max-w-20">
                  <h4 className={`text-xs font-medium ${getStageTextColor(stage.status)}`}>
                    {stage.name}
                  </h4>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {stage.responsible}
                  </p>
                  {stage.estimatedDays && (
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {stage.estimatedDays}d
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen por fases compacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${isDarkMode ? 'bg-neutral-700' : 'bg-blue-50'} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                En Ejecución
              </span>
            </div>
            <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              {executionProgress.completed}/{executionProgress.total}
            </span>
          </div>
          <div className={`w-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full h-2`}>
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${executionProgress.percentage}%` }}
            />
          </div>
        </div>

        <div className={`${isDarkMode ? 'bg-neutral-700' : 'bg-yellow-50'} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                En Espera
              </span>
            </div>
            <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              {waitingProgress.completed}/{waitingProgress.total}
            </span>
          </div>
          <div className={`w-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full h-2`}>
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${waitingProgress.percentage}%` }}
            />
          </div>
        </div>

        <div className={`${isDarkMode ? 'bg-neutral-700' : 'bg-green-50'} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                Finales
              </span>
            </div>
            <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              {finalProgress.completed}/{finalProgress.total}
            </span>
          </div>
          <div className={`w-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full h-2`}>
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${finalProgress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Estado actual del desarrollo */}
      <div className={`${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-100'} rounded-lg p-4`}>
        <h5 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
          Estado Actual del Desarrollo
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Desarrollo:</span>
            <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{developmentId}</span>
          </div>
          <div>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Fase Actual:</span>
            <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              {isCancelled ? 'Cancelado' : 
               stages.find(s => s.id === currentStage)?.phase === 'execution' ? 'En Ejecución' :
               stages.find(s => s.id === currentStage)?.phase === 'waiting' ? 'En Espera' : 'Final'}
            </span>
          </div>
          <div>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Etapa Actual:</span>
            <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              {isCancelled ? 'Cancelado' : stages.find(s => s.id === currentStage)?.name || 'Sin etapa'}
            </span>
          </div>
          <div>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Progreso:</span>
            <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{totalProgress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentTimelineCompact;
