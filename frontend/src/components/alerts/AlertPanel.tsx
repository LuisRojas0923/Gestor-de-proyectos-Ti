import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    Filter,
    Flag,
    Search,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { ActivityFilters, DevelopmentUpcomingActivity } from '../../types';

interface AlertPanelProps {
  developmentId?: string;
  showFilters?: boolean;
  limit?: number;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ 
  developmentId, 
  showFilters = true,
  limit = 10 
}) => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const { get, post, put } = useApi();

  const [activities, setActivities] = useState<DevelopmentUpcomingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({
    development_id: developmentId,
    days_ahead: 30,
    limit: limit
  });

  useEffect(() => {
    loadActivities();
  }, [filters]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await get(`/alerts/upcoming?${queryParams.toString()}`);
      
      if (response && response.all_activities) {
        setActivities(response.all_activities);
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Error al cargar las actividades');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActivity = async (activityId: number) => {
    try {
      await put(`/alerts/activities/${activityId}/complete`, {
        status: 'Completado',
        completed_at: new Date().toISOString(),
        completed_by: 'Usuario Actual'
      });

      // Recargar actividades
      loadActivities();
    } catch (err) {
      console.error('Error completing activity:', err);
      setError('Error al completar la actividad');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Crítica':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Alta':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'Media':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Baja':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Vencido':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Crítica':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'Alta':
        return <Flag size={16} className="text-orange-500" />;
      case 'Media':
        return <Clock size={16} className="text-yellow-500" />;
      case 'Baja':
        return <CheckCircle size={16} className="text-green-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
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

  return (
    <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          Actividades Próximas
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {activities.length} actividades
          </span>
          <button
            onClick={loadActivities}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-neutral-700"
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Filter size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Filtros
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Responsable
              </label>
              <select
                value={filters.responsible_party || ''}
                onChange={(e) => setFilters({ ...filters, responsible_party: e.target.value as any })}
                className={`w-full p-2 text-sm rounded-lg border ${
                  darkMode 
                    ? 'bg-neutral-600 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-neutral-900'
                }`}
              >
                <option value="">Todos</option>
                <option value="proveedor">Proveedor</option>
                <option value="usuario">Usuario</option>
                <option value="equipo_interno">Equipo Interno</option>
              </select>
            </div>
            
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Prioridad
              </label>
              <select
                value={filters.priority || ''}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                className={`w-full p-2 text-sm rounded-lg border ${
                  darkMode 
                    ? 'bg-neutral-600 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-neutral-900'
                }`}
              >
                <option value="">Todas</option>
                <option value="Crítica">Crítica</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
            
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Días hacia adelante
              </label>
              <select
                value={filters.days_ahead || 30}
                onChange={(e) => setFilters({ ...filters, days_ahead: Number(e.target.value) })}
                className={`w-full p-2 text-sm rounded-lg border ${
                  darkMode 
                    ? 'bg-neutral-600 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-neutral-900'
                }`}
              >
                <option value={7}>7 días</option>
                <option value={15}>15 días</option>
                <option value={30}>30 días</option>
                <option value={60}>60 días</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Actividades */}
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`p-4 rounded-lg border ${
                darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-gray-50 border-gray-200'
              } ${isOverdue(activity.due_date) && activity.status === 'Pendiente' ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getPriorityIcon(activity.priority)}
                    <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                      {activity.title}
                    </h4>
                    {isOverdue(activity.due_date) && activity.status === 'Pendiente' && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full dark:bg-red-900/20 dark:text-red-400">
                        Vencido
                      </span>
                    )}
                  </div>
                  
                  {activity.description && (
                    <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {activity.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <Calendar size={12} className={darkMode ? 'text-gray-500' : 'text-gray-500'} />
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                        {new Date(activity.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Users size={12} className={darkMode ? 'text-gray-500' : 'text-gray-500'} />
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                        {activity.responsible_party}
                      </span>
                    </div>
                    
                    {activity.responsible_person && (
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                        {activity.responsible_person}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2 ml-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(activity.priority)}`}>
                      {activity.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                  
                  {activity.status === 'Pendiente' && (
                    <button
                      onClick={() => handleCompleteActivity(activity.id)}
                      className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Completar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Calendar size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <h4 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              No hay actividades próximas
            </h4>
            <p>No se encontraron actividades que coincidan con los filtros seleccionados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
