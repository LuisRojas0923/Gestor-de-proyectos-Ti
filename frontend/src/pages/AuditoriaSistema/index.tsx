import { FileSearch, RefreshCw } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { Button, Text, Title } from '../../components/atoms';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import type { AuditoriaEvento } from '../../types/auditoria';
import { getAuditoriaColumnAccessors } from './components/auditoriaColumns';
import AuditoriaEventoDetalle from './components/AuditoriaEventoDetalle';
import AuditoriaEventosTable from './components/AuditoriaEventosTable';
import { useAuditoriaEventos } from './hooks/useAuditoriaEventos';
import { columnFiltersDesdeFiltros, filtrosDesdeColumnFilters } from './utils/mapFiltrosAuditoria';

const AuditoriaSistemaPage: React.FC = () => {
  const {
    eventos,
    total,
    page,
    pageSize,
    setPage,
    filtros,
    reemplazarFiltros,
    limpiarFiltros,
    isLoading,
    error,
    recargar,
  } = useAuditoriaEventos();
  const [seleccionado, setSeleccionado] = useState<AuditoriaEvento | null>(null);

  const columnAccessors = useMemo(() => getAuditoriaColumnAccessors(), []);

  const {
    cascadingOptions,
    setColumnFilter,
    clearAllFilters,
    activeFilterCount,
    sortState,
    setSort,
  } = useColumnFilters(eventos, columnAccessors, 'auditoria_sistema');

  const columnFilters = useMemo(
    () => columnFiltersDesdeFiltros(filtros),
    [filtros]
  );

  const eventosOrdenados = useMemo(() => {
    if (!sortState?.dir) return eventos;
    const accessor = columnAccessors[sortState.key];
    if (!accessor) return eventos;
    return [...eventos].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      return sortState.dir === 'asc'
        ? av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
        : bv.localeCompare(av, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [eventos, sortState, columnAccessors]);

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  const handleFilterChange = useCallback((columnKey: string, filter: Set<string>) => {
    setColumnFilter(columnKey, filter);
    const merged = { ...columnFiltersDesdeFiltros(filtros), [columnKey]: filter };
    reemplazarFiltros(filtrosDesdeColumnFilters(merged));
  }, [filtros, reemplazarFiltros, setColumnFilter]);

  const handleLimpiarFiltros = useCallback(() => {
    clearAllFilters();
    limpiarFiltros();
  }, [clearAllFilters, limpiarFiltros]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileSearch className="w-8 h-8 text-[var(--color-primary)]" />
          <div>
            <Title variant="h2">Auditoría del Sistema</Title>
            <Text variant="body2" color="text-secondary">Trazabilidad de acciones realizadas por usuarios</Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Text variant="caption" className="text-yellow-600 dark:text-yellow-400 font-medium">
              {activeFilterCount} filtro(s) activo(s)
            </Text>
          )}
          <Button variant="ghost" onClick={handleLimpiarFiltros}>Limpiar filtros</Button>
          <Button variant="secondary" onClick={recargar} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <Text className="text-red-600">{error}</Text>
      )}

      <AuditoriaEventosTable
        eventos={eventosOrdenados}
        isLoading={isLoading}
        columnFilters={columnFilters}
        cascadingOptions={cascadingOptions}
        onFilterChange={handleFilterChange}
        onVerDetalle={setSeleccionado}
        sortState={sortState}
        onSort={setSort}
      />

      <div className="flex items-center justify-between">
        <Text variant="body2" color="text-secondary">{total} evento(s) en total</Text>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <Text>{page} / {totalPaginas}</Text>
          <Button variant="secondary" size="sm" disabled={page >= totalPaginas} onClick={() => setPage(page + 1)}>
            Siguiente
          </Button>
        </div>
      </div>

      <AuditoriaEventoDetalle evento={seleccionado} onCerrar={() => setSeleccionado(null)} />
    </div>
  );
};

export default AuditoriaSistemaPage;
