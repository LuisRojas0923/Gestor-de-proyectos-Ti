import { useState, useCallback } from 'react';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useApi } from '../../../hooks/useApi';
import { DevelopmentWithCurrentStatus } from '../../../types';
import { API_ENDPOINTS } from '../../../config/api';

const PAGE_SIZE = 100;

export const useDevelopments = () => {
  const { addNotification } = useNotifications();
  const { getWithHeaders } = useApi<DevelopmentWithCurrentStatus[]>();
  const [developments, setDevelopments] = useState<DevelopmentWithCurrentStatus[]>([]);
  const [selectedDevelopment, setSelectedDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const hasMore = total !== null && developments.length < total;

  const loadDevelopments = useCallback(async () => {
    setInitialLoading(true);
    setDevelopments([]);
    setTotal(null);
    try {
      const response = await getWithHeaders(`${API_ENDPOINTS.DEVELOPMENTS}?solo_mios=true&skip=0&limit=${PAGE_SIZE}`);
      if (response) {
        const { data, headers } = response;
        setDevelopments(data);
        const headerTotal = headers.get('X-Total-Count');
        setTotal(headerTotal !== null ? Number(headerTotal) : data.length);
      }
    } catch (error) {
      addNotification('error', 'Error al cargar los desarrollos.');
    } finally {
      setInitialLoading(false);
    }
  }, [getWithHeaders, addNotification]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await getWithHeaders(
        `${API_ENDPOINTS.DEVELOPMENTS}?solo_mios=true&skip=${developments.length}&limit=${PAGE_SIZE}`
      );
      if (response) {
        setDevelopments(prev => [...prev, ...response.data]);
        const headerTotal = response.headers.get('X-Total-Count');
        if (headerTotal !== null) setTotal(Number(headerTotal));
      }
    } catch {
      addNotification('error', 'Error al cargar más desarrollos.');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, developments.length, getWithHeaders, addNotification]);

  return {
    developments,
    setDevelopments,
    selectedDevelopment,
    setSelectedDevelopment,
    total,
    hasMore,
    loadingMore,
    initialLoading,
    loadDevelopments,
    loadMore,
  };
};
