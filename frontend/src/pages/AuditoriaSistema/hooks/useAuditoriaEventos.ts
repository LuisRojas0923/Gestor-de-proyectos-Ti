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

  const cargar = useCallback(async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [get, filtros, page]);

  useEffect(() => {
    cargar();
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
