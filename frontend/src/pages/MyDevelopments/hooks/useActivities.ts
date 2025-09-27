import { useState, useCallback, useEffect } from 'react';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useApi } from '../../../hooks/useApi';
import { API_ENDPOINTS } from '../../../config/api';
import { DevelopmentWithCurrentStatus } from '../../../types';

export const useActivities = (selectedDevelopment: DevelopmentWithCurrentStatus | null) => {
  const { get, put, delete: del } = useApi();
  const { addNotification } = useNotifications();
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const loadActivities = useCallback(async () => {
    if (!selectedDevelopment) return;
    setActivitiesLoading(true);
    try {
      const response = await get(API_ENDPOINTS.ACTIVITY_LOG_LIST(selectedDevelopment.id)) as any;
      setActivities(response?.activities || []);
    } catch (error) {
      addNotification('error', 'Error cargando actividades');
    } finally {
      setActivitiesLoading(false);
    }
  }, [selectedDevelopment, get]);

  const confirmDeleteActivity = useCallback(async (activityId: number) => {
    try {
      await del(API_ENDPOINTS.ACTIVITY_LOG_DELETE(activityId));
      setActivities(prev => prev.filter(a => a.id !== activityId));
      addNotification('success', 'Actividad eliminada');
    } catch (error) {
      addNotification('error', 'Error al eliminar la actividad');
    }
  }, [del]);

  const confirmEditActivity = useCallback(async (activityId: number, form: any) => {
    try {
      const response = await put(API_ENDPOINTS.ACTIVITY_LOG_UPDATE(activityId), form);
      if (response) {
        setActivities(prev => prev.map(a => a.id === activityId ? response : a));
        addNotification('success', 'Actividad actualizada');
        return true;
      }
      return false;
    } catch (error) {
      addNotification('error', 'Error al actualizar la actividad');
      return false;
    }
  }, [put]);

  useEffect(() => {
    if (selectedDevelopment) {
      loadActivities();
    } else {
      setActivities([]);
    }
  }, [selectedDevelopment, loadActivities]);

  return {
    activities,
    setActivities,
    activitiesLoading,
    loadActivities,
    confirmDeleteActivity,
    confirmEditActivity,
  };
};
