import { useCallback, useState } from 'react';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { API_CONFIG, ERROR_MESSAGES, HTTP_STATUS } from '../config/api';
import { useAppContext } from '../context/AppContext';

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
  const { dispatch } = useAppContext();
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

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers as any,
    };

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, { // [CONTROLADO]
        ...options,
        headers,
      });

      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        console.error(`🔒 401 Unauthorized en ${url}. Token presente: ${!!token}, Token (primeros 20): ${token ? token.substring(0, 20) + '...' : 'NULL'}. Ejecutando logout...`);
        dispatch({ type: 'LOGOUT' });
        return null;
      }

      if (!response.ok) {
        let body: { detail?: unknown; message?: string } | null = null;
        try { body = await response.json(); } catch { /* ignore */ }

        let errorMessage: string;
        if (body?.detail != null) {
          if (Array.isArray(body.detail)) {
            errorMessage = (body.detail as { msg?: string; loc?: unknown[] }[])
              .map((e) => e.msg || (e.loc ? `${e.loc.join('.')}: error` : JSON.stringify(e)))
              .join('; ') || getErrorMessage(response.status);
          } else if (typeof body.detail === 'string') {
            errorMessage = body.detail;
          } else {
            errorMessage = body?.message || getErrorMessage(response.status);
          }
        } else {
          errorMessage = body?.message || getErrorMessage(response.status);
        }
        console.error(`API Error [${response.status}] at ${url}:`, body);
        throw new Error(errorMessage);
      }

      const data = await response.json(); // [CONTROLADO]
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      console.error(`Fetch Error at ${url}:`, error);
      let errorMessage: string = ERROR_MESSAGES.UNKNOWN_ERROR;

      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
        errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({ data: null, loading: false, error: errorMessage });

      // Notificar errores graves (red o servidor)
      if (errorMessage === ERROR_MESSAGES.NETWORK_ERROR || errorMessage === ERROR_MESSAGES.SERVER_ERROR) {
        addNotification('error', errorMessage);
      }

      throw error;
    }
  }, []);

  const get = useCallback((url: string) => request(url), [request]); // [CONTROLADO]

  const post = useCallback(
    (url: string, data: any) =>
      request(url, { // [CONTROLADO]
        method: 'POST',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const put = useCallback(
    (url: string, data: any) =>
      request(url, { // [CONTROLADO]
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const patch = useCallback(
    (url: string, data: any) =>
      request(url, { // [CONTROLADO]
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const del = useCallback(
    (url: string) =>
      request(url, { // [CONTROLADO]
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