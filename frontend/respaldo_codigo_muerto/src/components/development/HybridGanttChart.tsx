import React, { useMemo } from 'react';
import { Calendar, Clock, User, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { Title, Text, MaterialCard } from '../atoms';

interface Activity {
  id: number;
  stage_name: string;
  stage_code: string;
  activity_type: string;
  start_date: string;
  end_date?: string;
  status: string;
  actor_type: string;
  notes?: string;
  created_at: string;
}

interface DevelopmentStage {
  id: number;
  stage_name: string;
  stage_code: string;
  phase_name: string;
  is_milestone: boolean;
  estimated_days: number;
  responsible_party: string;
}

interface HybridGanttChartProps {
  activities: Activity[];
  stages: DevelopmentStage[];
  currentStageId?: number;
  darkMode: boolean;
}

interface GanttItem {
  id: string;
  name: string;
  type: 'stage' | 'activity';
  startDate: Date;
  endDate: Date;
  status: 'completed' | 'in_progress' | 'pending' | 'cancelled';
  responsible: string;
  isMilestone: boolean;
  phase: string;
  activity?: Activity;
  stage?: DevelopmentStage;
}

export const HybridGanttChart: React.FC<HybridGanttChartProps> = ({
  activities,
  stages,
  currentStageId,
  darkMode
}) => {
  // Procesar datos para el Gantt
  const ganttData = useMemo(() => {
    const items: GanttItem[] = [];

    // 1. Agregar actividades reales
    activities.forEach(activity => {
      const startDate = new Date(activity.start_date);
      const endDate = activity.end_date ? new Date(activity.end_date) : new Date(activity.start_date);

      // Si no hay fecha de fin, asumir 1 día de duración
      if (!activity.end_date) {
        endDate.setDate(startDate.getDate() + 1);
      }

      let status: GanttItem['status'] = 'pending';
      if (activity.status === 'completada') status = 'completed';
      else if (activity.status === 'en_curso') status = 'in_progress';
      else if (activity.status === 'cancelada') status = 'cancelled';

      items.push({
        id: `activity-${activity.id}`,
        name: `${activity.stage_name} - ${activity.activity_type}`,
        type: 'activity',
        startDate,
        endDate,
        status,
        responsible: activity.actor_type,
        isMilestone: false,
        phase: 'Actividades Reales',
        activity
      });
    });

    // 2. Agregar etapas planificadas (solo las que no tienen actividades)
    const stagesWithActivities = new Set(activities.map(a => a.stage_name));

    stages.forEach(stage => {
      if (!stagesWithActivities.has(stage.stage_name)) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + stage.estimated_days);

        let status: GanttItem['status'] = 'pending';
        if (currentStageId && stage.id === currentStageId) {
          status = 'in_progress';
        }

        items.push({
          id: `stage-${stage.id}`,
          name: stage.stage_name,
          type: 'stage',
          startDate,
          endDate,
          status,
          responsible: stage.responsible_party,
          isMilestone: stage.is_milestone,
          phase: stage.phase_name,
          stage
        });
      }
    });

    // Ordenar por fecha de inicio
    return items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [activities, stages, currentStageId]);

  // Calcular rango de fechas
  const dateRange = useMemo(() => {
    if (ganttData.length === 0) return { start: new Date(), end: new Date() };

    const dates = ganttData.flatMap((item: GanttItem) => [item.startDate, item.endDate]);
    const start = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
    const end = new Date(Math.max(...dates.map((d: Date) => d.getTime())));

    // Agregar margen de 7 días
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);

    return { start, end };
  }, [ganttData]);

  // Generar días del timeline
  const timelineDays = useMemo(() => {
    const days = [];
    const current = new Date(dateRange.start);

    while (current <= dateRange.end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [dateRange]);

  // Calcular posición y ancho de cada item
  const getItemPosition = (item: GanttItem) => {
    const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const itemStart = Math.ceil((item.startDate.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const itemDuration = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60 * 24));

    const leftPercent = (itemStart / totalDays) * 100;
    const widthPercent = (itemDuration / totalDays) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 2)}%` // Mínimo 2% de ancho
    };
  };

  const getStatusColor = (status: GanttItem['status'], type: GanttItem['type']) => {
    if (type === 'activity') {
      switch (status) {
        case 'completed': return darkMode ? 'bg-green-600' : 'bg-green-500';
        case 'in_progress': return darkMode ? 'bg-blue-600' : 'bg-blue-500';
        case 'cancelled': return darkMode ? 'bg-red-600' : 'bg-red-500';
        default: return darkMode ? 'bg-yellow-600' : 'bg-yellow-500';
      }
    } else {
      switch (status) {
        case 'completed': return darkMode ? 'bg-green-700' : 'bg-green-400';
        case 'in_progress': return darkMode ? 'bg-blue-700' : 'bg-blue-400';
        case 'cancelled': return darkMode ? 'bg-red-700' : 'bg-red-400';
        default: return darkMode ? 'bg-gray-600' : 'bg-gray-300';
      }
    }
  };

  const getStatusIcon = (status: GanttItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle size={12} />;
      case 'in_progress': return <Play size={12} />;
      case 'cancelled': return <AlertCircle size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const getResponsibleIcon = (responsible: string) => {
    switch (responsible) {
      case 'equipo_interno': return <User size={12} />;
      case 'proveedor': return <User size={12} />;
      case 'usuario': return <User size={12} />;
      default: return <User size={12} />;
    }
  };

  if (ganttData.length === 0) {
    return (
      <MaterialCard className="text-center p-8 border-2 border-dashed">
        <Calendar size={48} className={`mx-auto mb-4 ${darkMode ? 'text-neutral-500' : 'text-neutral-400'}`} />
        <Title variant="h3" weight="medium" className="mb-2">
          No hay datos para mostrar
        </Title>
        <Text variant="body2">
          Crea actividades en la bitácora para ver el cronograma
        </Text>
      </MaterialCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con información */}
      <MaterialCard className="!p-4">
        <div className="flex items-center justify-between mb-2">
          <Title variant="h3" weight="semibold">
            Cronograma Híbrido
          </Title>
          <Text variant="body2" color="secondary">
            {ganttData.length} elementos • {activities.length} actividades • {stages.length} etapas
          </Text>
        </div>
        <Text variant="body2" color="secondary">
          Combina actividades reales de la bitácora con etapas planificadas del desarrollo
        </Text>
      </MaterialCard>

      {/* Leyenda */}
      <MaterialCard className="!p-3">
        <Title variant="h4" weight="medium" className="mb-2">
          Leyenda:
        </Title>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-green-600' : 'bg-green-500'}`}></div>
            <Text variant="caption" color="secondary">Completada</Text>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}></div>
            <Text variant="caption" color="secondary">En Progreso</Text>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-yellow-600' : 'bg-yellow-500'}`}></div>
            <Text variant="caption" color="secondary">Pendiente</Text>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <Text variant="caption" color="secondary">Planificada</Text>
          </div>
        </div>
      </MaterialCard>

      {/* Timeline */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header del timeline */}
          <div className={`sticky top-0 z-10 ${darkMode ? 'bg-neutral-800' : 'bg-white'} border-b border-neutral-200 dark:border-neutral-700`}>
            <div className="flex">
              <div className="w-64 p-3 border-r border-neutral-200 dark:border-neutral-700">
                <Text variant="body2" weight="medium">
                  Actividad / Etapa
                </Text>
              </div>
              <div className="flex-1 overflow-x-auto">
                <div className="flex min-w-max">
                  {timelineDays.map((day, index) => (
                    <div
                      key={index}
                      className={`w-16 p-2 text-center border-r border-neutral-200 dark:border-neutral-700 ${day.getDay() === 0 || day.getDay() === 6
                        ? darkMode ? 'bg-neutral-700' : 'bg-neutral-50'
                        : ''
                        }`}
                    >
                      <Text variant="caption" color="secondary">
                        {day.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Items del Gantt */}
          <div className="space-y-1">
            {ganttData.map((item) => {
              const position = getItemPosition(item);
              return (
                <div
                  key={item.id}
                  className={`flex items-center h-12 border-b border-neutral-100 dark:border-neutral-800 hover:${darkMode ? 'bg-neutral-700' : 'bg-neutral-50'}`}
                >
                  {/* Nombre del item */}
                  <div className="w-64 p-3 border-r border-neutral-200 dark:border-neutral-700 flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(item.status)}
                      {getResponsibleIcon(item.responsible)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Text variant="body2" weight="medium" className="truncate">
                        {item.name}
                      </Text>
                      <Text variant="caption" color="secondary" className="truncate">
                        {item.type === 'activity' ? 'Actividad' : 'Etapa'} • {item.phase}
                      </Text>
                    </div>
                  </div>

                  {/* Barra del Gantt */}
                  <div className="flex-1 relative h-full">
                    {(() => {
                      const ganttBarStyle = {
                        left: position.left,
                        width: position.width,
                        minWidth: '20px',
                        fontSize: '10px'
                      };
                      return (
                        <Text
                          as="div"
                          className={`absolute top-1 bottom-1 rounded ${getStatusColor(item.status, item.type)} flex items-center justify-center text-white font-medium`}
                          style={ganttBarStyle}
                        >
                          {item.isMilestone && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </Text>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <MaterialCard className="!p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <Text weight="medium">
              Actividades Completadas:
            </Text>
            <Text className="ml-2" color="secondary">
              {ganttData.filter((item: GanttItem) => item.status === 'completed').length}
            </Text>
          </div>
          <div className="flex items-center">
            <Text weight="medium">
              En Progreso:
            </Text>
            <Text className="ml-2" color="secondary">
              {ganttData.filter((item: GanttItem) => item.status === 'in_progress').length}
            </Text>
          </div>
          <div className="flex items-center">
            <Text weight="medium">
              Pendientes:
            </Text>
            <Text className="ml-2" color="secondary">
              {ganttData.filter((item: GanttItem) => item.status === 'pending').length}
            </Text>
          </div>
        </div>
      </MaterialCard>
    </div>
  );
};
