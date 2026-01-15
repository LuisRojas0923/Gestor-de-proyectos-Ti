import React from 'react';
import { MaterialCard, MaterialTypography } from '../atoms';
import { CheckCircle, Edit, Trash2, Clock, Calendar, User } from 'lucide-react';
import { Activity } from '../../types';

interface ActivityCardProps {
  activity: Activity;
  darkMode: boolean;
  onComplete?: (activity: Activity) => void;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
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
  // Función para obtener las clases de estado según el mockup
  const getStatusClasses = (status: string): string => {
    switch (status) {
      case 'en_curso':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'completada':
        return 'bg-green-600 hover:bg-green-700';
      case 'pendiente':
        return 'bg-red-600 hover:bg-red-700';
      case 'cancelada':
        return 'bg-gray-600 hover:bg-gray-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
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


  // Componente para mostrar un dato con ícono (del mockup)
  const DataField = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex flex-col space-y-0.5">
      <div className={`flex items-center text-xs font-medium ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
        {icon}
        <span className="ml-1">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${darkMode ? 'text-neutral-200' : 'text-neutral-900'}`}>
        {value}
      </p>
    </div>
  );

  return (
    <MaterialCard
      darkMode={darkMode}
      elevation={2}
      className={`w-full rounded-xl p-4 space-y-4 ${darkMode ? 'bg-neutral-800 text-white shadow-2xl' : 'bg-white text-neutral-900 shadow-xl border border-neutral-200'}`}
    >
      {/* 1. SECCIÓN DE ETIQUETAS Y TÍTULO */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 mb-3 ${darkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>
        {/* Tags (Mejorados: Espaciado con gap-2) */}
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-0">
          <span
            className={`px-3 py-1 text-sm font-bold rounded-full text-white shadow-md transition-colors ${getStatusClasses(activity.status)}`}
          >
            {activity.status.toUpperCase().replace('_', ' ')}
          </span>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-100 text-neutral-800'}`}
          >
            {activity.stage_code || 'N/A'}. {activity.stage_name}
          </span>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-800'}`}
          >
            {activity.activity_type}
          </span>
          {activity.actor_type && (
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${darkMode ? 'bg-purple-700 text-purple-200' : 'bg-purple-100 text-purple-800'}`}
            >
              {activity.actor_type}
            </span>
          )}
        </div>

        {/* Título de la nota/referencia */}
        <MaterialTypography variant="h5" darkMode={darkMode} className="font-extrabold">
          {activity.notes || `Actividad ${activity.id}`}
        </MaterialTypography>
      </div>

      {/* 2. SECCIÓN DE ACCIONES (Botones Flotantes Mejorados) */}
      <div className={`flex gap-4 justify-start border-b pb-4 mb-4 ${darkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>

        {/* Botón de Éxito (Completar) - Estilo Primario y Flotante */}
        {showCompleteButton && activity.status !== 'completada' && onComplete && (
          <button
            onClick={() => onComplete(activity)}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold 
                    rounded-full shadow-lg hover:bg-green-600 
                    transition-all"
            title="Marcar como completada"
          >
            <CheckCircle size={20} /> Completar
          </button>
        )}

        {/* Botón de Edición - Estilo Secundario con Icono */}
        {onEdit && (
          <button
            onClick={() => onEdit(activity)}
            className={`flex items-center gap-2 px-5 py-3 border ${darkMode ? 'border-neutral-500 text-neutral-200 hover:bg-neutral-600' : 'border-neutral-600 text-neutral-700 hover:bg-neutral-50'
              } font-semibold 
                    rounded-full shadow-md
                    transition-all`}
            title="Editar detalles de la actividad"
          >
            <Edit size={20} /> Editar
          </button>
        )}

        {/* Botón de Peligro (Eliminar) - Icono Flotante Pequeño */}
        {onDelete && (
          <button
            onClick={() => onDelete(activity)}
            className="p-3 bg-red-500 text-white 
                    rounded-full shadow-lg hover:bg-red-600 
                    transition-all"
            title="Eliminar actividad"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* 3. SECCIÓN DE METADATOS (Distribución en Columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Fecha de Inicio */}
        <DataField
          icon={<Calendar size={20} />}
          label="Fecha de Inicio"
          value={formatDate(activity.start_date)}
        />

        {/* Fecha de Fin */}
        <DataField
          icon={<Calendar size={20} />}
          label="Fecha de Fin"
          value={formatDate(activity.end_date)}
        />

        {/* Próximo Seguimiento */}
        <DataField
          icon={<Clock size={20} />}
          label="Próximo Seguimiento"
          value={activity.next_follow_up_at ? formatDate(activity.next_follow_up_at) : 'No programado'}
        />

        {/* Etapa */}
        <DataField
          icon={<Calendar size={20} />}
          label="Etapa"
          value={`${activity.stage_code}. ${activity.stage_name}`}
        />

        {/* Tipo de Actividad */}
        <DataField
          icon={<User size={20} />}
          label="Tipo"
          value={activity.activity_type}
        />
      </div>

      {/* 4. SECCIÓN DE NOTAS */}
      {activity.notes && (
        <div className={`pt-3 border-t ${darkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>
          <MaterialTypography variant="h6" darkMode={darkMode} className="font-semibold mb-1">
            Notas Adicionales
          </MaterialTypography>
          <p className={`italic ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
            {activity.notes}
          </p>
        </div>
      )}

      {/* 5. PIE DE PÁGINA: Creador y Fecha */}
      <div className={`pt-3 border-t flex justify-between items-center text-sm ${darkMode ? 'border-neutral-700 text-neutral-500' : 'border-neutral-200 text-neutral-500'}`}>
        <div className="flex items-center">
          <Clock size={16} className="mr-1" />
          Creado: {formatDateTime(activity.created_at).date} a las {formatDateTime(activity.created_at).time}
        </div>
        <div className="flex items-center">
          por <User size={16} className="ml-1 mr-1" /> {activity.created_by || 'system'}
        </div>
      </div>
    </MaterialCard>
  );
};

export default ActivityCard;
