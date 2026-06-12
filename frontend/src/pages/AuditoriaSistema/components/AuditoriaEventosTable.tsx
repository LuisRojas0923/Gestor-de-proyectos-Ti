import { Eye, FileSearch } from 'lucide-react';
import React, { useMemo } from 'react';
import { Button } from '../../../components/atoms';
import { DataTable } from '../../../components/molecules/DataTable';
import type { AuditoriaEvento } from '../../../types/auditoria';
import {
  buildAuditoriaColumnOptions,
  getAuditoriaColumns,
} from './auditoriaColumns';

interface Props {
  eventos: AuditoriaEvento[];
  isLoading: boolean;
  columnFilters: Record<string, Set<string>>;
  cascadingOptions: Record<string, string[]>;
  onFilterChange: (columnKey: string, filter: Set<string>) => void;
  onVerDetalle: (evento: AuditoriaEvento) => void;
  sortState: { key: string; dir: 'asc' | 'desc' | null } | null;
  onSort: (key: string, dir: 'asc' | 'desc' | null) => void;
}

const AuditoriaEventosTable: React.FC<Props> = ({
  eventos,
  isLoading,
  columnFilters,
  cascadingOptions,
  onFilterChange,
  onVerDetalle,
  sortState,
  onSort,
}) => {
  const columns = useMemo(() => getAuditoriaColumns(), []);
  const columnOptions = useMemo(
    () => buildAuditoriaColumnOptions(eventos, cascadingOptions),
    [eventos, cascadingOptions]
  );

  return (
    <DataTable<AuditoriaEvento>
      columns={columns}
      data={eventos}
      keyExtractor={(row) => String(row.id)}
      onRowClick={onVerDetalle}
      columnFilters={columnFilters}
      columnOptions={columnOptions}
      onFilterChange={onFilterChange}
      activeSortKey={sortState?.key ?? null}
      activeSortDir={sortState?.dir ?? null}
      onSort={onSort}
      isLoading={isLoading}
      loadingMessage="Cargando eventos de auditoría..."
      emptyMessage="No hay eventos para los filtros seleccionados"
      emptyIcon={
        <div className="p-4 rounded-full bg-[var(--color-surface-variant)] text-neutral-400">
          <FileSearch size={32} />
        </div>
      }
      maxHeight="max-h-[calc(100vh-220px)]"
      minHeight="min-h-[200px]"
      className="!rounded-2xl border border-[var(--color-border)] shadow-sm"
      showRowIndicator
      rowIndicatorColor="bg-[var(--color-primary)]"
      renderRowActions={(row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onVerDetalle(row);
          }}
        >
          <Eye className="w-4 h-4 mr-1" />
          Ver
        </Button>
      )}
      actionsMinWidth="90px"
    />
  );
};

export default AuditoriaEventosTable;
