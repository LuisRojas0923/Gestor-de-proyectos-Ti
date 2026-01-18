import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Search, Users } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { Activity } from '../../types';
import { API_ENDPOINTS } from '../../config/api';
import { Button, Select, Title, Text, Icon } from '../atoms';

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
        <Title variant="h5" weight="bold">
          Actividades de la Bitácora
        </Title>
        <div className="flex items-center space-x-2">
          {showFilters && (
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'pendientes_en_curso', label: 'Pendientes y En Curso' },
                { value: 'completada', label: 'Completadas' },
                { value: 'cancelada', label: 'Canceladas' },
                { value: 'todas', label: 'Todas' }
              ]}
              size="sm"
              className="min-w-[180px]"
            />
          )}
          <Text variant="caption" color="text-secondary">
            {activities.length} actividades
          </Text>
          <Button
            variant="outline"
            size="sm"
            icon={Search}
            onClick={loadActivities}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name={AlertTriangle} size="sm" color="error" />
            <Text variant="body2" color="error">{error}</Text>
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
                  <Title variant="h6" weight="medium" className="mb-1">
                    {activity.development?.name || 'Desarrollo no especificado'}
                  </Title>

                  <Text variant="body2" weight="bold" className="mb-1 text-blue-600 dark:text-blue-400">
                    {activity.stage_name}
                  </Text>

                  {activity.notes && (
                    <Text variant="body2" color="text-secondary" className="mb-3">
                      {activity.notes}
                    </Text>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <Icon name={Calendar} size="xs" color="text-secondary" />
                      <Text variant="caption" color="text-secondary">
                        Inicio: {activity.start_date ? new Date(activity.start_date).toLocaleDateString() : 'N/A'}
                      </Text>
                    </div>

                    {activity.end_date && (
                      <div className="flex items-center space-x-1">
                        <Icon name={Calendar} size="xs" color="text-secondary" />
                        <Text variant="caption" color="text-secondary">
                          Fin: {new Date(activity.end_date).toLocaleDateString()}
                        </Text>
                      </div>
                    )}

                    <div className="flex items-center space-x-1">
                      <Icon name={Users} size="xs" color="text-secondary" />
                      <Text variant="caption" color="text-secondary">
                        {activity.actor_type}
                      </Text>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2 ml-4">
                  <Text as="span" variant="caption" className={`px-2 py-1 rounded-full ${getStatusColor(activity.status)}`}>
                    {activity.status.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/developments/${activity.development_id}`)}
                  >
                    Gestionar
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 flex justify-center text-neutral-400">
              <Icon name={Calendar} size="xl" />
            </div>
            <Title variant="h6" weight="medium" className="mb-2">
              No hay actividades con el filtro seleccionado
            </Title>
            <Text variant="body2" color="text-secondary">Prueba a seleccionar otro estado en el filtro.</Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
