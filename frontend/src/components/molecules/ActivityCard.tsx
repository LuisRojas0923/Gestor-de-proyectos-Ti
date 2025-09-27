import React from 'react';
import { MaterialCard, Badge } from '../atoms';
import { MaterialButton } from '../atoms';

interface ActivityData {
  id: number;
  status: 'pendiente' | 'en_curso' | 'completada' | 'cancelada';
  stage_code: string;
  stage_name: string;
  activity_type: string;
  actor_type?: string;
  start_date?: string;
  end_date?: string;
  next_follow_up_at?: string;
  notes?: string;
  dynamic_payload?: Record<string, any>;
  created_at: string;
  created_by?: string;
}

interface ActivityCardProps {
  activity: ActivityData;
  darkMode: boolean;
  onComplete?: (activity: ActivityData) => void;
  onEdit?: (activity: ActivityData) => void;
  onDelete?: (activity: ActivityData) => void;
  showCompleteButton?: boolean;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  darkMode,
  onComplete,
  onEdit,
  onDelete,
  showCompleteButton = true,
}) => {
  // Función para obtener el variant del badge según el estado
  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'completada': return 'success';
      case 'en_curso': return 'info';
      case 'pendiente': return 'warning';
      case 'cancelada': return 'default';
      default: return 'default';
    }
  };

  // Función para formatear fechas
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string): { date: string; time: string } => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Función para formatear nombres de campos dinámicos
  const formatFieldName = (key: string): string => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <MaterialCard 
      darkMode={darkMode}
      elevation={1}
      className={`border-2 ${darkMode ? 'border-neutral-600' : 'border-neutral-200'} ${activity.status === 'completada' ? 'opacity-75 border-l-4 border-green-500' : ''}`}
    >
      {/* Header con badges y botones de acción */}
      <MaterialCard.Header darkMode={darkMode}>
        <div className="space-y-4">
          {/* Badges - Siempre en su propia fila */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getStatusVariant(activity.status)} size="sm">
              {activity.status}
            </Badge>
            <Badge variant="default" size="sm">
              {activity.stage_code}. {activity.stage_name}
            </Badge>
            <Badge variant="info" size="sm">
              {activity.activity_type}
            </Badge>
            {activity.actor_type && (
              <Badge variant="default" size="sm" className="bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-200">
                {activity.actor_type}
              </Badge>
            )}
          </div>
          
          {/* Botones de acción - Responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
            {showCompleteButton && activity.status !== 'completada' && onComplete && (
              <MaterialButton
                variant="contained"
                color="success"
                size="small"
                onClick={() => onComplete(activity)}
                title="Marcar como completada"
                className="w-full sm:w-auto min-h-[44px]"
              >
                ✓ Completar
              </MaterialButton>
            )}
            {onEdit && (
              <MaterialButton
                variant="outlined"
                size="small"
                onClick={() => onEdit(activity)}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Editar
              </MaterialButton>
            )}
            {onDelete && (
              <MaterialButton
                variant="contained"
                color="error"
                size="small"
                onClick={() => onDelete(activity)}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Eliminar
              </MaterialButton>
            )}
          </div>
        </div>
      </MaterialCard.Header>

      {/* Contenido principal */}
      <MaterialCard.Content darkMode={darkMode} className="space-y-4">
        {/* Información de fechas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Fecha de Inicio
            </label>
            <p className={`text-sm ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              {formatDate(activity.start_date)}
            </p>
          </div>
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Fecha de Fin
            </label>
            <p className={`text-sm ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              {formatDate(activity.end_date)}
            </p>
          </div>
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Próximo Seguimiento
            </label>
            <p className={`text-sm ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              {activity.next_follow_up_at ? formatDate(activity.next_follow_up_at) : 'No programado'}
            </p>
          </div>
        </div>

        {/* Notas */}
        {activity.notes && (
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Notas
            </label>
            <p className={`text-sm mt-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
              {activity.notes}
            </p>
          </div>
        )}

        {/* Campos dinámicos específicos de la etapa */}
        {activity.dynamic_payload && Object.keys(activity.dynamic_payload).length > 0 && (
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Detalles Específicos de la Etapa
            </label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(activity.dynamic_payload).map(([key, value]) => (
                <div key={key} className={`p-3 rounded ${darkMode ? 'bg-neutral-600' : 'bg-neutral-100'}`}>
                  <span className={`text-xs font-medium ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {formatFieldName(key)}:
                  </span>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                    {String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </MaterialCard.Content>

      {/* Footer con información de auditoría */}
      <MaterialCard.Actions darkMode={darkMode} className="border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 text-xs w-full">
          <span className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Creado: {formatDateTime(activity.created_at).date} a las {formatDateTime(activity.created_at).time}
          </span>
          {activity.created_by && (
            <span className={`${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              por {activity.created_by}
            </span>
          )}
        </div>
      </MaterialCard.Actions>
    </MaterialCard>
  );
};

export default ActivityCard;
