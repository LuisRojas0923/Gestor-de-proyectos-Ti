import { useCallback, useMemo, useState } from 'react';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { API_CONFIG, ERROR_MESSAGES, HTTP_STATUS } from '../config/api';
import { useAppContext } from '../context/AppContext';
import { AuthService } from '../services/AuthService';

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiRequestOptions extends RequestInit {
  notifyOnError?: boolean;
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
    options: ApiRequestOptions = {},
    _retriedWithRefresh = false
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const token = localStorage.getItem('token');
    const { notifyOnError = true, ...fetchOptions } = options;

    // Si el body es FormData, el navegador debe elijir el Content-Type (con boundary) automaticamente.
    const isFormData = fetchOptions.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
    new Headers(fetchOptions.headers).forEach((value, key) => {
      headers[key] = value;
    });

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, { // [CONTROLADO]
        ...fetchOptions,
        headers,
      });

      // 401: intentar refresh silencioso una vez antes de desloguar.
      // Esto evita que un token expirado (mientras el usuario estaba en
      // el portal) lo saque del panel al volver.
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        // No intentamos refresh contra el endpoint de refresh mismo (recursion
        // infinita) ni contra endpoints publicos (no tiene sentido).
        const isAuthEndpoint = url.includes('/auth/');
        if (!_retriedWithRefresh && !isAuthEndpoint) {
          const newToken = await AuthService.refreshAccessToken();
          if (newToken) {
            // Reintentar la request original con el token nuevo.
            return request(url, options, true);
          }
        }
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

      if (response.status === 204 || response.headers.get('content-length') === '0') {
        setState({ data: null, loading: false, error: null });
        return null;
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
      if (notifyOnError && (errorMessage === ERROR_MESSAGES.NETWORK_ERROR || errorMessage === ERROR_MESSAGES.SERVER_ERROR)) {
        addNotification('error', errorMessage);
      }

      throw error;
    }
  }, [addNotification, dispatch]);

  const get = useCallback((url: string, options: ApiRequestOptions = {}) => request(url, options), [request]); // [CONTROLADO]

  const getWithHeaders = useCallback(async (url: string): Promise<{ data: T; headers: Headers } | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, { headers });
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        const isAuthEndpoint = url.includes('/auth/');
        const newToken = !isAuthEndpoint ? await AuthService.refreshAccessToken() : null;
        if (newToken) {
          return getWithHeaders(url);
        }
        dispatch({ type: 'LOGOUT' });
        return null;
      }
      if (!response.ok) {
        let body: { detail?: unknown; message?: string } | null = null;
        try { body = await response.json(); } catch { /* ignore */ }
        const msg = (typeof body?.detail === 'string' && body.detail) || body?.message || getErrorMessage(response.status);
        throw new Error(msg);
      }
      const data = await response.json();
      setState({ data, loading: false, error: null });
      return { data, headers: response.headers };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, [dispatch]);

  const post = useCallback(
    (url: string, data: unknown, options: ApiRequestOptions = {}) =>
      request(url, { // [CONTROLADO]
        method: 'POST',
        body: data instanceof FormData ? data : JSON.stringify(data),
        ...options,
      }),
    [request]
  );

  const put = useCallback(
    (url: string, data: unknown, options: ApiRequestOptions = {}) =>
      request(url, { // [CONTROLADO]
        method: 'PUT',
        body: data instanceof FormData ? data : JSON.stringify(data),
        ...options,
      }),
    [request]
  );

  const patch = useCallback(
    (url: string, data: unknown, options: ApiRequestOptions = {}) =>
      request(url, { // [CONTROLADO]
        method: 'PATCH',
        body: data instanceof FormData ? data : JSON.stringify(data),
        ...options,
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

  return useMemo(() => ({
    ...state,
    get,
    getWithHeaders,
    post,
    put,
    patch,
    delete: del,
  }), [state, get, getWithHeaders, post, put, patch, del]);
}
