import React, { useDeferredValue, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Smartphone, Check, X, Search } from 'lucide-react';
import { Button, Input, Title, Text, Icon, Badge, Select, MaterialCard } from '../../../components/atoms';
import { Callout, DataTable } from '../../../components/molecules';
import { DataTableColumn } from '../../../components/molecules/DataTable';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useColumnFilters } from '../../../hooks/useColumnFilters';
import { EquipoMovil } from '../useCorporateLines';
import { CorporateDeleteConfirmModal } from './CorporateDeleteConfirmModal';

interface Props {
  equipos: EquipoMovil[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onCreate: (data: Partial<EquipoMovil>) => Promise<EquipoMovil>;
  onUpdate: (id: number, data: Partial<EquipoMovil>) => Promise<EquipoMovil>;
  onDelete: (id: number) => Promise<void>;
}

const EQUIPO_ACCESSORS = {
  id: (equipo: EquipoMovil) => equipo.id,
  marca: (equipo: EquipoMovil) => equipo.marca || '(Vacío)',
  modelo: (equipo: EquipoMovil) => equipo.modelo,
  imei: (equipo: EquipoMovil) => equipo.imei || '(Vacío)',
  estado: (equipo: EquipoMovil) => equipo.estado_fisico,
};

export const EquiposManager: React.FC<Props> = ({
  equipos,
  isLoading,
  error,
  onRetry,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const { addNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<EquipoMovil>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<EquipoMovil | null>(null);
  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase());
  const {
    filteredData,
    filters,
    cascadingOptions,
    setColumnFilter,
    sortState,
    setSort,
    activeFilterCount,
    clearAllFilters,
  } = useColumnFilters(equipos, EQUIPO_ACCESSORS, 'lineas_equipos');

  const columns = useMemo<DataTableColumn<EquipoMovil>[]>(() => [
    { key: 'id', label: 'ID', minWidth: '70px', filterable: true, render: (equipo) => <Text weight="bold">#{equipo.id}</Text> },
    { key: 'marca', label: 'Marca', minWidth: '120px', filterable: true, render: (equipo) => equipo.marca || 'Sin marca' },
    { key: 'modelo', label: 'Modelo', minWidth: '160px', flex: true, filterable: true },
    { key: 'imei', label: 'IMEI / Serial', minWidth: '180px', filterable: true, render: (equipo) => (
      <div><Text variant="body2">{equipo.imei || 'Sin IMEI'}</Text><Text variant="caption" color="text-secondary">{equipo.serial || 'Sin serial'}</Text></div>
    ) },
    { key: 'estado', label: 'Estado', minWidth: '110px', centered: true, filterable: true, render: (equipo) => (
      <Badge variant={equipo.estado_fisico === 'NUEVO' ? 'info' : equipo.estado_fisico === 'BUENO' ? 'success' : equipo.estado_fisico === 'DAÑADO' ? 'error' : 'warning'}>{equipo.estado_fisico}</Badge>
    ) },
  ], []);

  const startCreate = () => {
    setIsCreating(true);
    setIsEditing(null);
    setFormData({ estado_fisico: 'BUENO', marca: '', modelo: '', imei: '', serial: '', observaciones: '' });
  };

  const startEdit = (equipo: EquipoMovil) => {
    setIsEditing(equipo.id);
    setIsCreating(false);
    setFormData(equipo);
  };

  const cancelForm = () => {
    setIsEditing(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.modelo?.trim()) {
      addNotification('warning', 'El modelo es obligatorio.');
      return;
    }

    setIsProcessing(true);
    try {
      if (isCreating) {
        await onCreate(formData);
        addNotification('success', 'Equipo añadido al inventario');
      } else if (isEditing) {
        await onUpdate(isEditing, formData);
        addNotification('success', 'Equipo actualizado');
      }
      cancelForm();
    } catch (err: unknown) {
      addNotification('error', err instanceof Error ? err.message : 'Error al guardar el equipo');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      await onDelete(deleteTarget.id);
      addNotification('success', 'Equipo eliminado');
      setDeleteTarget(null);
    } catch (err: unknown) {
      addNotification('error', err instanceof Error ? err.message : 'Error al eliminar el equipo');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredEquipos = filteredData.filter((equipo) => !deferredSearch || [
    equipo.modelo,
    equipo.marca,
    equipo.imei,
    equipo.serial,
  ].some((value) => value?.toLowerCase().includes(deferredSearch)));
  const visibleEquipos = filteredEquipos.slice(0, 200);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <MaterialCard className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <Title variant="h4" className="flex items-center gap-2">
            <Icon name={Smartphone} className="text-primary" />
            Inventario de Equipos Móviles
          </Title>
          <Text variant="caption" className="opacity-60">Gestione los dispositivos físicos de la empresa.</Text>
        </div>
        {!isCreating && !isEditing && (
          <Button variant="primary" onClick={startCreate} icon={Plus} className="rounded-xl px-6">
            Nuevo Equipo
          </Button>
        )}
      </MaterialCard>

      {(isCreating || isEditing) && (
        <MaterialCard className="p-6 space-y-4">
          <Title variant="h5">{isCreating ? 'Añadir Nuevo Equipo' : 'Editar Equipo'}</Title>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Marca"
              value={formData.marca || ''}
              onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              className="!rounded-xl"
              placeholder="Ej: Samsung, Apple"
            />
            <Input
              label="Modelo *"
              value={formData.modelo || ''}
              onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              className="!rounded-xl"
              placeholder="Ej: Galaxy S23, iPhone 15"
            />
            <Input
              label="IMEI"
              value={formData.imei || ''}
              onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
              className="!rounded-xl"
            />
            <Input
              label="Serial"
              value={formData.serial || ''}
              onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
              className="!rounded-xl"
            />
            <Select
              label="Estado Físico"
              value={formData.estado_fisico || 'BUENO'}
              onChange={(e) => setFormData({ ...formData, estado_fisico: e.target.value })}
              options={[
                { label: 'NUEVO', value: 'NUEVO' },
                { label: 'BUENO', value: 'BUENO' },
                { label: 'REGULAR', value: 'REGULAR' },
                { label: 'MALO', value: 'MALO' },
                { label: 'DAÑADO', value: 'DAÑADO' },
              ]}
              className="!rounded-xl"
            />
            <Input
              label="Observaciones"
              value={formData.observaciones || ''}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="!rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={cancelForm} icon={X} disabled={isProcessing}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} icon={Check} loading={isProcessing}>
              Guardar
            </Button>
          </div>
        </MaterialCard>
      )}

      <MaterialCard className="overflow-hidden">
        <div className="flex flex-col gap-3 p-6 border-b border-[var(--color-border)] sm:flex-row sm:items-center sm:justify-between">
          <Input
            aria-label="Buscar equipos"
            placeholder="Buscar por marca, modelo, IMEI o serial..."
            icon={Search}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="max-w-md !rounded-xl"
          />
          <div className="flex items-center gap-3">
            <Text variant="caption" color="text-secondary">
              Mostrando {visibleEquipos.length} de {filteredEquipos.length}
            </Text>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Limpiar filtros ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>
        {error ? (
          <Callout variant="error" title="No fue posible cargar los equipos" className="m-6">
            <Text variant="body2">{error}</Text>
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">Reintentar</Button>
          </Callout>
        ) : (
          <DataTable
            columns={columns}
            data={visibleEquipos}
            keyExtractor={(equipo) => String(equipo.id)}
            isLoading={isLoading}
            loadingMessage="Cargando equipos..."
            emptyMessage={equipos.length === 0 ? 'No hay equipos registrados' : 'No se encontraron resultados'}
            maxHeight="max-h-[420px]"
            columnFilters={filters}
            columnOptions={cascadingOptions}
            onFilterChange={setColumnFilter}
            activeSortKey={sortState?.key}
            activeSortDir={sortState?.dir}
            onSort={setSort}
            renderRowActions={(equipo) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" icon={Edit2} aria-label={`Editar equipo ${equipo.modelo}`} disabled={isProcessing} onClick={() => startEdit(equipo)} />
                <Button variant="ghost" size="sm" icon={Trash2} aria-label={`Eliminar equipo ${equipo.modelo}`} disabled={isProcessing} onClick={() => setDeleteTarget(equipo)} />
              </div>
            )}
          />
        )}
      </MaterialCard>

      <CorporateDeleteConfirmModal
        isOpen={deleteTarget !== null}
        title="¿Eliminar equipo?"
        description={deleteTarget ? `Se eliminará ${deleteTarget.modelo}. La operación se bloqueará si está asignado.` : ''}
        isProcessing={isProcessing}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
