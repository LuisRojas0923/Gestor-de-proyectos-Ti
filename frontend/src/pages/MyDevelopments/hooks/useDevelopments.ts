import { useState, useCallback } from 'react';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useApi } from '../../../hooks/useApi';
import { DevelopmentWithCurrentStatus } from '../../../types';
import { API_ENDPOINTS } from '../../../config/api';

export const useDevelopments = () => {
  const { addNotification } = useNotifications();
  const { get } = useApi();
  const [developments, setDevelopments] = useState<DevelopmentWithCurrentStatus[]>([]);
  const [selectedDevelopment, setSelectedDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);

  const loadDevelopments = useCallback(async () => {
    try {
      const response = await get(API_ENDPOINTS.DEVELOPMENTS);
      if (Array.isArray(response)) {
        setDevelopments(response);
      } else {
        addNotification('error', 'La respuesta de la API no tiene el formato esperado.');
      }
    } catch (error) {
      addNotification('error', 'Error al cargar los desarrollos.');
    }
  }, [get]);

  return {
    developments,
    setDevelopments,
    selectedDevelopment,
    setSelectedDevelopment,
    loadDevelopments,
  };
};
