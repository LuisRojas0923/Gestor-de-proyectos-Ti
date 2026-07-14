import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import type { AuditoriaEvento, AuditoriaEventosPaginados, FiltrosAuditoria } from '../../../types/auditoria';

const PAGE_SIZE = 50;

function buildQuery(filtros: FiltrosAuditoria): string {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useAuditoriaEventos() {
  const { get } = useApi<AuditoriaEventosPaginados>();
  const [eventos, setEventos] = useState<AuditoriaEvento[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setIsLoading(true);
    setError(null);
    try {
      const data = await get(
        `/auditoria/eventos${buildQuery({ ...filtros, page, page_size: PAGE_SIZE })}`
      );
      if (data) {
        setEventos(data.items);
        setTotal(data.total);
      }
    } catch {
      setError('No se pudo cargar el registro de auditoría');
    } finally {
      if (!silencioso) setIsLoading(false);
    }
  }, [get, filtros, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const conectar = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = wsHost.includes('localhost')
        ? `${wsProtocol}//localhost:8000/api/v2/auditoria/ws/dashboard`
        : `${wsProtocol}//${wsHost}/api/v2/auditoria/ws/dashboard`;

      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'UPDATE_INDICADORES') {
            cargar(true);
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      socket.onclose = () => {
        timeoutId = setTimeout(conectar, 5000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    conectar();

    return () => {
      if (socket) socket.close();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [cargar]);

  const actualizarFiltros = (nuevos: Partial<FiltrosAuditoria>) => {
    setPage(1);
    setFiltros((prev) => ({ ...prev, ...nuevos }));
  };

  const reemplazarFiltros = (nuevos: FiltrosAuditoria) => {
    setPage(1);
    setFiltros(nuevos);
  };

  const limpiarFiltros = () => {
    setPage(1);
    setFiltros({});
  };

  return {
    eventos,
    total,
    page,
    pageSize: PAGE_SIZE,
    setPage,
    filtros,
    actualizarFiltros,
    reemplazarFiltros,
    limpiarFiltros,
    isLoading,
    error,
    recargar: cargar,
  };
}
