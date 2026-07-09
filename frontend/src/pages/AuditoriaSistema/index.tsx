import { FileSearch, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { Button, Text, Title } from '../../components/atoms';
import type { AuditoriaEvento } from '../../types/auditoria';
import AuditoriaEventoDetalle from './components/AuditoriaEventoDetalle';
import UltimosEventosTable from '../ServicePortal/pages/AuditoriaIndicadores/components/UltimosEventosTable';
import { useAuditoriaEventos } from './hooks/useAuditoriaEventos';

const AuditoriaSistemaPage: React.FC = () => {
  const {
    eventos,
    total,
    page,
    pageSize,
    setPage,
    limpiarFiltros,
    isLoading,
    error,
    recargar,
  } = useAuditoriaEventos();
  const [seleccionado, setSeleccionado] = useState<AuditoriaEvento | null>(null);

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

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
          <Button variant="secondary" onClick={recargar} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <Text className="text-red-600">{error}</Text>
      )}

      <UltimosEventosTable
        datos={eventos}
        isLoading={isLoading}
        onVerDetalle={setSeleccionado}
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
