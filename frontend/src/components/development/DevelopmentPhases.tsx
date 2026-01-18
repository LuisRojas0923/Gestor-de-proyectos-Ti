import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  TrendingUp
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Title, Subtitle, Text } from '../atoms';
import { useApi } from '../../hooks/useApi';
import {
  DevelopmentCycleFlow,
  DevelopmentPhase,
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
  const { get } = useApi();

  const [phases, setPhases] = useState<DevelopmentPhase[]>([]);
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
        const [phasesData, cycleFlowData] = await Promise.all([
          get('/fases') as Promise<DevelopmentPhase[]>,
          get('/etapas/cycle-flow') as Promise<DevelopmentCycleFlow[]>
        ]);

        setPhases(phasesData || []);
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
      case 'En Ejecución': return 'bg-blue-500';
      case 'En Espera': return 'bg-yellow-500';
      case 'Finales / Otros': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPhaseIcon = (phaseName: string) => {
    switch (phaseName) {
      case 'En Ejecución': return TrendingUp;
      case 'En Espera': return Clock;
      case 'Finales / Otros': return CheckCircle;
      default: return AlertTriangle;
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
      case 'completed': return 'bg-green-500 text-white';
      case 'current': return 'bg-blue-500 text-white';
      case 'pending': return 'bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)]';
      default: return 'bg-gray-300 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--color-surface)] border border-red-500/50 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle size={20} />
          <Text color="error">{error}</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between mb-8">
        <Title variant="h3">
          Sistema de Fases y Etapas
        </Title>
        {currentDevelopment && (
          <div className="bg-[var(--color-primary)]/10 px-3 py-1 rounded-full">
            <Text variant="caption" weight="bold" color="primary">
              Progreso: {currentDevelopment.stage_progress_percentage || 0}%
            </Text>
          </div>
        )}
      </div>

      {/* Flujo del Ciclo Completo */}
      <div className="mb-10">
        <Subtitle variant="h4" className="mb-6">
          Flujo del Ciclo de Desarrollo
        </Subtitle>
        <div className="space-y-6">
          {cycleFlow.map((stage, index) => {
            const status = getStageStatus(stage.stage_id);
            const Icon = getPhaseIcon(stage.phase_name);

            return (
              <div key={stage.stage_id} className="flex items-start space-x-4">
                {/* Número de etapa */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-sm ${getStageStatusColor(status)}`}>
                  {stage.stage_code}
                </div>

                {/* Información de la etapa */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <Icon size={16} className="text-[var(--color-text-secondary)]" />
                    <Text weight="bold" className="truncate">
                      {stage.stage_name}
                    </Text>
                    {stage.is_milestone && (
                      <Text variant="caption" weight="bold" className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full uppercase tracking-wider">
                        Hito
                      </Text>
                    )}
                  </div>
                  {stage.stage_description && (
                    <Text variant="body2" color="text-secondary" className="mt-1 leading-relaxed">
                      {stage.stage_description}
                    </Text>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <Text variant="caption" color="text-secondary" className="bg-[var(--color-surface-variant)] px-2 py-0.5 rounded">
                      Responsable: <Text as="span" weight="medium" color="text-primary">{stage.responsible_party_name}</Text>
                    </Text>
                    {stage.estimated_days && (
                      <Text variant="caption" color="text-secondary" className="bg-[var(--color-surface-variant)] px-2 py-0.5 rounded">
                        <Clock size={10} className="inline mr-1" />
                        {stage.estimated_days} días
                      </Text>
                    )}
                  </div>
                </div>

                {/* Indicador de progreso */}
                {status === 'current' && currentDevelopment?.stage_progress_percentage && (
                  <div className="w-24 hidden sm:block">
                    <div className="bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${currentDevelopment.stage_progress_percentage}%` }}
                      ></div>
                    </div>
                    <Text variant="caption" align="center" weight="bold" className="mt-1 block">
                      {currentDevelopment.stage_progress_percentage}%
                    </Text>
                  </div>
                )}

                {/* Flecha de conexión */}
                {index < cycleFlow.length - 1 && (
                  <div className="pt-2">
                    <ChevronRight size={16} className="text-[var(--color-border)]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen por Fases */}
      {showAllPhases && (
        <div className="pt-8 border-t border-[var(--color-border)]/50">
          <Subtitle variant="h4" className="mb-6">
            Resumen por Fases
          </Subtitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {phases.map((phase) => {
              const phaseStages = cycleFlow.filter(stage => stage.phase_id === phase.id);
              const completedStages = phaseStages.filter(stage => getStageStatus(stage.stage_id) === 'completed').length;
              const currentStages = phaseStages.filter(stage => getStageStatus(stage.stage_id) === 'current').length;
              const Icon = getPhaseIcon(phase.phase_name);
              const percentage = phaseStages.length > 0 ? ((completedStages + currentStages) / phaseStages.length) * 100 : 0;

              return (
                <div key={phase.id} className="bg-[var(--color-surface-variant)]/30 border border-[var(--color-border)]/30 rounded-2xl p-5 hover:border-[var(--color-primary)]/30 transition-colors duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-3 h-3 rounded-full shadow-sm ${getPhaseColor(phase.phase_name)}`}></div>
                    <Icon size={18} className="text-[var(--color-text-secondary)]" />
                    <Text weight="bold">
                      {phase.phase_name}
                    </Text>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <Text variant="caption" color="text-secondary">Etapas:</Text>
                      <Text weight="bold" variant="body2">
                        {completedStages + currentStages}/{phaseStages.length}
                      </Text>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-700 ease-in-out"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    {phase.phase_description && (
                      <Text variant="caption" color="text-secondary" className="italic line-clamp-2">
                        {phase.phase_description}
                      </Text>
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
        <div className="mt-10 p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
          <Subtitle variant="h5" color="primary" className="mb-4">
            Estado Actual del Desarrollo
          </Subtitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <Text variant="caption" color="text-secondary" weight="medium">Desarrollo:</Text>
              <Text weight="bold" className="block truncate">{currentDevelopment.name}</Text>
            </div>
            <div className="space-y-1">
              <Text variant="caption" color="text-secondary" weight="medium">Fase Actual:</Text>
              <Text weight="bold" className="block truncate">{currentDevelopment.current_phase?.phase_name || 'No definida'}</Text>
            </div>
            <div className="space-y-1">
              <Text variant="caption" color="text-secondary" weight="medium">Etapa Actual:</Text>
              <Text weight="bold" className="block truncate">{currentDevelopment.current_stage?.stage_name || 'No definida'}</Text>
            </div>
            <div className="space-y-1">
              <Text variant="caption" color="text-secondary" weight="medium">Progreso:</Text>
              <Text weight="bold" color="primary" className="block">{currentDevelopment.stage_progress_percentage || 0}%</Text>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevelopmentPhases;
