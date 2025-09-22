import React, { useEffect, useState } from 'react';
import { LucideIcon, TrendingUp, Clock, CheckCircle, XCircle, FileText, Code, TestTube, Shield, Rocket } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import Badge from '../atoms/Badge';
import { phases, debug } from '../../utils/logger';

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

  // Debug: Log para verificar los valores recibidos (comentado para evitar errores)
  // console.log('DevelopmentTimelineCompact Debug:', {
  //   developmentId,
  //   currentStage,
  //   isCancelled,
  //   currentStageType: typeof currentStage,
  //   cycleFlowDataLength: cycleFlowData.length
  // });

  // Cargar datos del ciclo de desarrollo desde la API
  useEffect(() => {
    const loadCycleFlow = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await api.get('/stages/cycle-flow');
        // console.log('Cycle flow data loaded:', data);
        
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
  }, [developmentId]); // Cambiar dependencia de api a developmentId

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
    
    // Debug: Log para cada etapa
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
      estimatedDays: stageData.estimated_days
    }))
    .sort((a, b) => {
      // Ordenar por ID de etapa en orden secuencial: 1,2,3,4,5,6,7,8,9,10,11 (donde 11 es Cancelado)
      // Cancelado (ID 11) debe ir al final, así que le damos el valor más alto
      const aId = a.id === 11 ? 12 : a.id; // Cancelado (ID 11) va al final como 12
      const bId = b.id === 11 ? 12 : b.id;
      return aId - bId;
    });

  // Calcular progreso general - corregir el cálculo NaN
  const totalProgress = (() => {
    if (isCancelled) return 0;
    
    // Validar que currentStage sea un número válido
    const validStage = typeof currentStage === 'number' && !isNaN(currentStage) ? currentStage : 1;
    
    // Asegurar que esté en el rango correcto (1-11)
    const clampedStage = Math.max(1, Math.min(11, validStage));
    
    // Calcular progreso basado en 10 etapas (0-100%)
    return Math.round(((clampedStage - 1) / 10) * 100);
  })();

  // Log para validar las fases (después de declarar totalProgress)
  phases.debug('Validación de Fases', {
    developmentId,
    currentStage,
    isCancelled,
    totalProgress: totalProgress + '%',
    cycleFlowDataLength: cycleFlowData.length,
    stagesCount: stages.length
  });
  
  // Log detallado de cada etapa
  stages.forEach((stage, index) => {
    phases.debug(`Etapa ${index + 1}`, {
      id: stage.id,
      name: stage.name,
      status: stage.status,
      responsible: stage.responsible,
      estimatedDays: stage.estimatedDays,
      phase: stage.phase
    });
  });

  const getStageStatusColor = (status: string) => {
    let colorClass;
    switch (status) {
      case 'completed':
        colorClass = isDarkMode ? 'bg-green-500 shadow-green-500/50 shadow-lg' : 'bg-green-600 shadow-green-600/50 shadow-lg';
        break;
      case 'current':
        colorClass = isDarkMode ? 'bg-blue-500 shadow-blue-500/50 shadow-lg animate-pulse' : 'bg-blue-600 shadow-blue-600/50 shadow-lg animate-pulse';
        break;
      case 'pending':
        colorClass = isDarkMode ? 'bg-gray-600' : 'bg-gray-300';
        break;
      case 'cancelled':
        colorClass = isDarkMode ? 'bg-red-500 shadow-red-500/50 shadow-lg' : 'bg-red-600 shadow-red-600/50 shadow-lg';
        break;
      default:
        colorClass = isDarkMode ? 'bg-gray-600' : 'bg-gray-300';
    }
    return colorClass;
  };

  // Función para obtener el Badge de estado apropiado
  const getStageStatusBadge = (status: string) => {
    debug.debug('Generando Badge', { status });
    
    switch (status) {
      case 'completed':
        return <Badge variant="success" size="sm">Completada</Badge>;
      case 'current':
        return <Badge variant="info" size="sm">En curso</Badge>;
      case 'pending':
        return <Badge variant="default" size="sm">Pendiente</Badge>;
      case 'cancelled':
        return <Badge variant="error" size="sm">Cancelada</Badge>;
      default:
        return <Badge variant="default" size="sm">Pendiente</Badge>;
    }
  };

  const getStageTextColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400 font-semibold';
      case 'current':
        return 'text-blue-600 dark:text-blue-400 font-semibold';
      case 'pending':
        return isDarkMode ? 'text-gray-400' : 'text-gray-500';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400 font-semibold';
      default:
        return isDarkMode ? 'text-gray-400' : 'text-gray-500';
    }
  };

  const getConnectorColor = (currentStatus: string, nextStatus?: string) => {
    if (currentStatus === 'completed') {
      return isDarkMode ? 'bg-green-500' : 'bg-green-600';
    } else if (currentStatus === 'current') {
      return isDarkMode ? 'bg-blue-500' : 'bg-blue-600';
    }
    return isDarkMode ? 'bg-gray-600' : 'bg-gray-300';
  };

  const handleStageClick = (stage: DevelopmentStage) => {
    if (onStageClick) {
      onStageClick(stage);
    }
  };

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Cargando etapas del desarrollo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar estado de error
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <XCircle size={48} className="mx-auto" />
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              Error: {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
          Sistema de Etapas
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
                    className={`absolute top-8 left-8 w-16 h-1 ${getConnectorColor(stage.status, stages[index + 1]?.status)}`}
                    style={{ zIndex: 1 }}
                  />
                )}

                {/* Círculo de la etapa */}
                <div 
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 ${getStageStatusColor(stage.status)}`}
                  onClick={() => handleStageClick(stage)}
                >
                  {stage.status === 'completed' ? (
                    <CheckCircle 
                      size={24} 
                      className="text-white" 
                    />
                  ) : (
                    <Icon 
                      size={20} 
                      className={stage.status === 'current' ? 'text-white' : isDarkMode ? 'text-gray-300' : 'text-gray-600'} 
                    />
                  )}
                </div>

                {/* Número de etapa - mejorado posicionamiento */}
                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 ${getStageStatusColor(stage.status)} shadow-lg`}>
                  {stage.id}
                </div>

                {/* Información de la etapa */}
                <div className="mt-4 text-center max-w-24">
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
                  {/* Badge de estado */}
                  <div className="mt-2 flex justify-center">
                    {getStageStatusBadge(stage.status)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Estado actual del desarrollo */}
      <div className={`${isDarkMode ? 'bg-neutral-700' : 'bg-neutral-100'} rounded-lg p-4`}>
        <h5 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
          Estado Actual del Desarrollo
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col space-y-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Desarrollo
            </span>
            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              {developmentId}
            </span>
          </div>
          <div className="flex flex-col space-y-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Etapa Actual
            </span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                {isCancelled ? 'Cancelado' : stages.find(s => s.id === currentStage)?.name || 'Sin etapa'}
              </span>
              {!isCancelled && stages.find(s => s.id === currentStage) && (
                getStageStatusBadge(stages.find(s => s.id === currentStage)?.status || 'pending')
              )}
              {isCancelled && (
                getStageStatusBadge('cancelled')
              )}
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Progreso General
            </span>
            <div className="flex items-center space-x-2">
              <Badge variant={totalProgress >= 80 ? 'success' : totalProgress >= 50 ? 'info' : 'warning'} size="sm">
                {totalProgress}%
              </Badge>
              <div className={`flex-1 h-2 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalProgress >= 80 ? (isDarkMode ? 'bg-green-500' : 'bg-green-600') :
                    totalProgress >= 50 ? (isDarkMode ? 'bg-blue-500' : 'bg-blue-600') :
                    (isDarkMode ? 'bg-yellow-500' : 'bg-yellow-600')
                  }`}
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentTimelineCompact;
