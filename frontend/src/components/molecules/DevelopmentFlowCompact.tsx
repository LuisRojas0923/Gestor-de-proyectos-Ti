import React from 'react';
import { LucideIcon, TrendingUp, Clock, CheckCircle, XCircle, FileText, Code, TestTube, Shield, Rocket } from 'lucide-react';
import MaterialMetricCard from './MaterialMetricCard';
import { useAppContext } from '../../context/AppContext';

interface DevelopmentStage {
  id: number;
  name: string;
  description: string;
  responsible: 'Usuario' | 'Proveedor' | 'Equipo Interno';
  status: 'completed' | 'current' | 'pending' | 'cancelled';
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  phase: 'execution' | 'waiting' | 'final';
  estimatedDays?: number;
}

interface DevelopmentFlowCompactProps {
  developmentId: string;
  currentStage?: number;
  darkMode?: boolean;
  onStageClick?: (stage: DevelopmentStage) => void;
}

const DevelopmentFlowCompact: React.FC<DevelopmentFlowCompactProps> = ({
  developmentId,
  currentStage = 1,
  darkMode = false,
  onStageClick
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
      color: currentStage >= 1 ? 'success' : 'info',
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
      color: currentStage >= 2 ? 'success' : 'info',
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
      color: currentStage >= 3 ? 'success' : currentStage === 3 ? 'warning' : 'info',
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
      color: currentStage >= 4 ? 'success' : currentStage === 4 ? 'warning' : 'info',
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
      color: currentStage >= 5 ? 'success' : currentStage === 5 ? 'warning' : 'info',
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
      color: currentStage >= 6 ? 'success' : currentStage === 6 ? 'warning' : 'info',
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
      color: currentStage >= 7 ? 'success' : currentStage === 7 ? 'warning' : 'info',
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
      color: currentStage >= 8 ? 'success' : currentStage === 8 ? 'warning' : 'info',
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
      color: currentStage >= 9 ? 'success' : currentStage === 9 ? 'warning' : 'info',
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
      color: currentStage >= 10 ? 'success' : 'info',
      phase: 'final',
      estimatedDays: 1
    },
    {
      id: 0,
      name: 'Cancelado',
      description: 'Desarrollo cancelado',
      responsible: 'Usuario',
      status: currentStage === 0 ? 'cancelled' : 'pending',
      icon: XCircle,
      color: 'error',
      phase: 'final',
      estimatedDays: 0
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

  // Calcular progreso general
  const totalProgress = Math.round((currentStage / 10) * 100);

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
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Progreso: {totalProgress}%
        </div>
      </div>

      {/* Grid de etapas usando MaterialMetricCard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stages.filter(stage => stage.id !== 0).map((stage) => (
          <div 
            key={stage.id} 
            onClick={() => handleStageClick(stage)}
            className="cursor-pointer transition-transform hover:scale-105"
          >
            <MaterialMetricCard
              title={stage.name}
              value={stage.id}
              subtitle={`${stage.description} • ${stage.responsible}`}
              icon={stage.icon}
              color={stage.color}
              trend={stage.status === 'completed' ? 'up' : stage.status === 'current' ? 'stable' : undefined}
            />
          </div>
        ))}
      </div>

      {/* Resumen por fases compacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MaterialMetricCard
          title="En Ejecución"
          value={`${executionProgress.completed}/${executionProgress.total}`}
          subtitle="Fase donde se realizan actividades activas de desarrollo"
          icon={TrendingUp}
          color="primary"
          trend="up"
        />
        <MaterialMetricCard
          title="En Espera"
          value={`${waitingProgress.completed}/${waitingProgress.total}`}
          subtitle="Fase donde el desarrollo está pausado esperando decisiones"
          icon={Clock}
          color="warning"
          trend="stable"
        />
        <MaterialMetricCard
          title="Finales / Otros"
          value={`${finalProgress.completed}/${finalProgress.total}`}
          subtitle="Estados terminales del desarrollo (exitoso o cancelado)"
          icon={CheckCircle}
          color="info"
        />
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
              {stages.find(s => s.id === currentStage)?.phase === 'execution' ? 'En Ejecución' :
               stages.find(s => s.id === currentStage)?.phase === 'waiting' ? 'En Espera' : 'Final'}
            </span>
          </div>
          <div>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Etapa Actual:</span>
            <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              {stages.find(s => s.id === currentStage)?.name || 'Sin etapa'}
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

export default DevelopmentFlowCompact;
