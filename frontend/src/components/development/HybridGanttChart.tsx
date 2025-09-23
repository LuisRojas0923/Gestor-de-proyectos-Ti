import React, { useMemo } from 'react';
import { Calendar, Clock, User, CheckCircle, AlertCircle, Play } from 'lucide-react';

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
    
    const dates = ganttData.flatMap(item => [item.startDate, item.endDate]);
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    
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
      <div className="text-center p-8 border-2 border-dashed rounded-lg border-neutral-300 dark:border-neutral-700">
        <Calendar size={48} className={`mx-auto mb-4 ${darkMode ? 'text-neutral-500' : 'text-neutral-400'}`} />
        <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          No hay datos para mostrar
        </h3>
        <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
          Crea actividades en la bitácora para ver el cronograma
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con información */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-neutral-700' : 'bg-neutral-100'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
            Cronograma Híbrido
          </h3>
          <div className="text-sm text-neutral-500">
            {ganttData.length} elementos • {activities.length} actividades • {stages.length} etapas
          </div>
        </div>
        <p className={`text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
          Combina actividades reales de la bitácora con etapas planificadas del desarrollo
        </p>
      </div>

      {/* Leyenda */}
      <div className={`p-3 rounded-lg ${darkMode ? 'bg-neutral-800' : 'bg-neutral-50'}`}>
        <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Leyenda:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-green-600' : 'bg-green-500'}`}></div>
            <span className={darkMode ? 'text-neutral-300' : 'text-neutral-600'}>Completada</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}></div>
            <span className={darkMode ? 'text-neutral-300' : 'text-neutral-600'}>En Progreso</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-yellow-600' : 'bg-yellow-500'}`}></div>
            <span className={darkMode ? 'text-neutral-300' : 'text-neutral-600'}>Pendiente</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <span className={darkMode ? 'text-neutral-300' : 'text-neutral-600'}>Planificada</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header del timeline */}
          <div className={`sticky top-0 z-10 ${darkMode ? 'bg-neutral-800' : 'bg-white'} border-b border-neutral-200 dark:border-neutral-700`}>
            <div className="flex">
              <div className="w-64 p-3 border-r border-neutral-200 dark:border-neutral-700">
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  Actividad / Etapa
                </span>
              </div>
              <div className="flex-1 overflow-x-auto">
                <div className="flex min-w-max">
                  {timelineDays.map((day, index) => (
                    <div
                      key={index}
                      className={`w-16 p-2 text-center border-r border-neutral-200 dark:border-neutral-700 ${
                        day.getDay() === 0 || day.getDay() === 6 
                          ? darkMode ? 'bg-neutral-700' : 'bg-neutral-50'
                          : ''
                      }`}
                    >
                      <div className={`text-xs ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {day.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                      </div>
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
                      <div className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                        {item.name}
                      </div>
                      <div className={`text-xs truncate ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {item.type === 'activity' ? 'Actividad' : 'Etapa'} • {item.phase}
                      </div>
                    </div>
                  </div>

                  {/* Barra del Gantt */}
                  <div className="flex-1 relative h-full">
                    <div
                      className={`absolute top-1 bottom-1 rounded ${getStatusColor(item.status, item.type)} flex items-center justify-center text-white text-xs font-medium`}
                      style={{
                        left: position.left,
                        width: position.width,
                        minWidth: '20px'
                      }}
                    >
                      {item.isMilestone && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className={`p-3 rounded-lg ${darkMode ? 'bg-neutral-800' : 'bg-neutral-50'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Actividades Completadas:
            </span>
            <span className={`ml-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
              {ganttData.filter(item => item.status === 'completed').length}
            </span>
          </div>
          <div>
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              En Progreso:
            </span>
            <span className={`ml-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
              {ganttData.filter(item => item.status === 'in_progress').length}
            </span>
          </div>
          <div>
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Pendientes:
            </span>
            <span className={`ml-2 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
              {ganttData.filter(item => item.status === 'pending').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
