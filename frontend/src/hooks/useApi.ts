import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useApi<T>() {
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
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      toast.error(errorMessage);
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
    delete: del,
  };
}