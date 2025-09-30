import { useCallback, useState } from 'react';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { API_CONFIG, ERROR_MESSAGES, HTTP_STATUS } from '../config/api';

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const getErrorMessage = (status: number): string => {
  switch (status) {
    case HTTP_STATUS.UNAUTHORIZED:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case HTTP_STATUS.NOT_FOUND:
      return ERROR_MESSAGES.NOT_FOUND;
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return ERROR_MESSAGES.VALIDATION_ERROR;
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return ERROR_MESSAGES.SERVER_ERROR;
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
};

export function useApi<T>() {
  const { addNotification } = useNotifications();
  const [state, setState] = useState<ApiResponse<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorMessage = getErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      let errorMessage: string = ERROR_MESSAGES.UNKNOWN_ERROR;
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setState({ data: null, loading: false, error: errorMessage });
      
      if (errorMessage === ERROR_MESSAGES.NETWORK_ERROR) {
        addNotification('error', errorMessage);
      }
      
      return null;
    }
  }, []);

  const get = useCallback((url: string) => request(url), [request]);
  
  const post = useCallback(
    (url: string, data: any) =>
      request(url, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const put = useCallback(
    (url: string, data: any) =>
      request(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const patch = useCallback(
    (url: string, data: any) =>
      request(url, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const del = useCallback(
    (url: string) =>
      request(url, {
        method: 'DELETE',
      }),
    [request]
  );

  return {
    ...state,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}