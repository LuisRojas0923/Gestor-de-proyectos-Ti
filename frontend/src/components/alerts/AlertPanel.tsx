import {
  AlertTriangle,
  Calendar,
  Search,
  Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { Activity } from '../../types';
import { API_ENDPOINTS } from '../../config/api';

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
  const { get } = useApi();
  const navigate = useNavigate();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pendientes_en_curso');

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        status: statusFilter,
      });

      if (developmentId) {
        queryParams.append('development_id', developmentId);
      }

      const response = await get(`${API_ENDPOINTS.DASHBOARD_PENDING_ACTIVITIES}?${queryParams.toString()}`);

      if (response && Array.isArray(response)) {
        setActivities(response as Activity[]);
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

  useEffect(() => {
    loadActivities();
  }, [statusFilter, developmentId, limit]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completada':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'en_curso':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'cancelada':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
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
          Actividades de la Bitácora
        </h3>
        <div className="flex items-center space-x-2">
          {showFilters && (
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full p-2 text-sm rounded-lg border ${darkMode
                  ? 'bg-neutral-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-neutral-900'
                  }`}
              >
                <option value="pendientes_en_curso">Pendientes y En Curso</option>
                <option value="completada">Completadas</option>
                <option value="cancelada">Canceladas</option>
                <option value="todas">Todas</option>
              </select>
            </div>
          )}
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

      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`p-4 rounded-lg border ${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-gray-50 border-gray-200'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                    {activity.development?.name || 'Desarrollo no especificado'}
                  </h4>

                  <h5 className={`text-sm font-bold mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {activity.stage_name}
                  </h5>

                  {activity.notes && (
                    <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {activity.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <Calendar size={12} className={darkMode ? 'text-gray-500' : 'text-gray-500'} />
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                        Inicio: {activity.start_date ? new Date(activity.start_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    {activity.end_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar size={12} className={darkMode ? 'text-gray-500' : 'text-gray-500'} />
                        <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                          Fin: {new Date(activity.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-1">
                      <Users size={12} className={darkMode ? 'text-gray-500' : 'text-gray-500'} />
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>
                        {activity.actor_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2 ml-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(activity.status)}`}>
                    {activity.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <button
                    onClick={() => navigate(`/developments/${activity.development_id}`)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${darkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                  >
                    Gestionar
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Calendar size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <h4 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              No hay actividades con el filtro seleccionado
            </h4>
            <p>Prueba a seleccionar otro estado en el filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
