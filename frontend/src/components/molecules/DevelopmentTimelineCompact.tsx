import React, { useEffect, useState } from 'react';
import { LucideIcon, TrendingUp, Clock, CheckCircle, XCircle, FileText, Code, TestTube, Shield, Rocket } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';

import { debug } from '../../utils/logger';
import { Button, Title, Text } from '../atoms';

interface DevelopmentStage {
  id: number;
  name: string;
  description: string;
  responsible: 'Usuario' | 'Proveedor' | 'Equipo Interno';
  status: 'completed' | 'current' | 'pending' | 'cancelled';
  icon: LucideIcon;
  phase: 'execution' | 'waiting' | 'final';
  estimatedDays?: number;
  sort_order?: number;
}

// Interfaz para los datos de la API
interface CycleFlowStage {
  stage_id: number;
  stage_code: string;
  stage_name: string;
  stage_description: string;
  phase_id: number;
  phase_name: string;
  phase_color: string;
  is_milestone: boolean;
  estimated_days: number;
  responsible_party: string;
  responsible_party_name: string;
  sort_order: number;
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
  const api = useApi();

  // Estado para los datos de la API
  const [cycleFlowData, setCycleFlowData] = useState<CycleFlowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del ciclo de desarrollo desde la API
  useEffect(() => {
    const loadCycleFlow = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.get('/etapas/cycle-flow');

        if (Array.isArray(data)) {
          setCycleFlowData(data);
        } else {
          setError('Formato de datos inválido');
        }
      } catch (err) {
        console.error('Error loading cycle flow:', err);
        setError('Error cargando datos del ciclo');
      } finally {
        setLoading(false);
      }
    };

    loadCycleFlow();
  }, [developmentId]);

  // Función para mapear iconos según el código de etapa
  const getStageIcon = (stageCode: string): LucideIcon => {
    const iconMap: { [key: string]: LucideIcon } = {
      '1': FileText,      // Definición
      '2': TrendingUp,    // Análisis
      '3': Clock,         // Propuesta
      '4': Shield,        // Aprobación
      '5': Code,          // Desarrollo
      '6': Rocket,        // Despliegue (Pruebas)
      '7': TestTube,      // Plan de Pruebas
      '8': TestTube,      // Ejecución Pruebas
      '9': Shield,        // Aprobación (Pase)
      '10': CheckCircle,  // Desplegado
      '0': XCircle        // Cancelado
    };
    return iconMap[stageCode] || FileText;
  };

  // Función para mapear fases
  const getPhaseType = (phaseName: string): 'execution' | 'waiting' | 'final' => {
    if (phaseName.includes('Ejecución')) return 'execution';
    if (phaseName.includes('Espera')) return 'waiting';
    return 'final';
  };

  // Función para determinar el estado de cada etapa
  const getStageStatus = (stageId: number): 'completed' | 'current' | 'pending' | 'cancelled' => {
    if (isCancelled) return 'cancelled';

    // Validar que currentStage sea un número válido
    const validCurrentStage = typeof currentStage === 'number' && !isNaN(currentStage) ? currentStage : 1;

    const status = stageId < validCurrentStage ? 'completed' :
      stageId === validCurrentStage ? 'current' : 'pending';

    debug.debug(`Etapa ${stageId}`, { currentStage: validCurrentStage, original: currentStage, status });

    return status;
  };

  // Convertir datos de la API a formato del componente y ordenar secuencialmente
  const stages: DevelopmentStage[] = cycleFlowData
    .map((stageData) => ({
      id: stageData.stage_id,
      name: stageData.stage_name,
      description: stageData.stage_description,
      responsible: stageData.responsible_party_name as 'Usuario' | 'Proveedor' | 'Equipo Interno',
      status: getStageStatus(stageData.stage_id),
      icon: getStageIcon(stageData.stage_code),
      phase: getPhaseType(stageData.phase_name),
      estimatedDays: stageData.estimated_days,
      sort_order: stageData.sort_order
    }))
    .sort((a, b) => {
      const stageOrderMap: { [key: number]: number } = {
        1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11
      };
      const aOrder = stageOrderMap[a.id] || 999;
      const bOrder = stageOrderMap[b.id] || 999;
      return aOrder - bOrder;
    });

  const totalProgress = (() => {
    if (isCancelled) return 0;
    const validStage = typeof currentStage === 'number' && !isNaN(currentStage) ? currentStage : 1;
    const clampedStage = Math.max(1, Math.min(11, validStage));
    return Math.round(((clampedStage - 1) / 10) * 100);
  })();

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return isDarkMode ? 'bg-green-500 shadow-green-500/50 shadow-lg' : 'bg-green-600 shadow-green-600/50 shadow-lg';
      case 'current': return isDarkMode ? 'bg-blue-500 shadow-blue-500/50 shadow-lg animate-pulse' : 'bg-blue-600 shadow-blue-600/50 shadow-lg animate-pulse';
      case 'pending': return isDarkMode ? 'bg-gray-600' : 'bg-gray-300';
      case 'cancelled': return isDarkMode ? 'bg-red-500 shadow-red-500/50 shadow-lg' : 'bg-red-600 shadow-red-600/50 shadow-lg';
      default: return isDarkMode ? 'bg-gray-600' : 'bg-gray-300';
    }
  };



  const getStageTextColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400 font-semibold';
      case 'current': return 'text-blue-600 dark:text-blue-400 font-semibold';
      case 'pending': return isDarkMode ? 'text-gray-400' : 'text-gray-500';
      case 'cancelled': return 'text-red-600 dark:text-red-400 font-semibold';
      default: return isDarkMode ? 'text-gray-400' : 'text-gray-500';
    }
  };

  const getConnectorColor = (currentStatus: string) => {
    if (currentStatus === 'completed') return isDarkMode ? 'bg-green-500' : 'bg-green-600';
    if (currentStatus === 'current') return isDarkMode ? 'bg-blue-500' : 'bg-blue-600';
    return isDarkMode ? 'bg-gray-600' : 'bg-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
          <Text variant="body2" color="secondary">Cargando etapas...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div>
          <XCircle size={48} className="mx-auto text-red-500 mb-4" />
          <Text color="error">{error}</Text>
          <Button variant="primary" onClick={() => window.location.reload()} className="mt-4">Reintentar</Button>
        </div>
      </div>
    );
  }

  const progressStyle = { width: `${totalProgress}%` };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Title variant="h3" weight="semibold">Sistema de Etapas</Title>
        <div className="flex items-center space-x-4">
          <Text variant="body2" color="secondary">Progreso: {totalProgress}%</Text>
          {!isCancelled && onCancel && (
            <Button variant="danger" size="sm" onClick={onCancel}>Cancelar</Button>
          )}
        </div>
      </div>

      <div className="relative">
        <div className={`absolute top-8 left-0 right-0 h-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full`}>
          <div
            className={`h-full ${isCancelled ? 'bg-red-500' : 'bg-blue-500'} rounded-full transition-all duration-500`}
            style={progressStyle}
          />
        </div>

        <div className={`flex justify-between items-start ${isCancelled ? 'pb-20' : 'pb-8'}`}>
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isLast = index === stages.length - 1;
            return (
              <div key={stage.id} className="flex flex-col items-center relative">
                {!isLast && (
                  <div className={`absolute top-8 left-8 w-16 h-1 z-0 ${getConnectorColor(stage.status)}`} />
                )}
                <div
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 ${getStageStatusColor(stage.status)}`}
                  onClick={() => onStageClick?.(stage)}
                >
                  {stage.status === 'completed' ? <CheckCircle size={24} className="text-white" /> : <Icon size={20} className={stage.status === 'current' ? 'text-white' : isDarkMode ? 'text-gray-300' : 'text-gray-600'} />}
                </div>
                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 ${getStageStatusColor(stage.status)} shadow-lg`}>
                  {stage.id}
                </div>
                <div className="mt-4 text-center max-w-24">
                  <Title variant="h6" weight="medium" className={getStageTextColor(stage.status)}>{stage.name}</Title>
                  <Text variant="caption" color="secondary" className="mt-1">{stage.responsible}</Text>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DevelopmentTimelineCompact;
