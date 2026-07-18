import React, { useDeferredValue, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Users, Check, X, Search } from 'lucide-react';
import { Button, Input, Title, Text, Icon, Badge, Select, MaterialCard } from '../../../components/atoms';
import { Callout, DataTable } from '../../../components/molecules';
import { DataTableColumn } from '../../../components/molecules/DataTable';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useColumnFilters } from '../../../hooks/useColumnFilters';
import { PersonaLinea } from '../useCorporateLines';
import { CorporateDeleteConfirmModal } from './CorporateDeleteConfirmModal';

interface Props {
  personas: PersonaLinea[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onCreate: (data: Partial<PersonaLinea>) => Promise<PersonaLinea>;
  onUpdate: (documento: string, data: Partial<PersonaLinea>) => Promise<PersonaLinea>;
  onDelete: (documento: string) => Promise<void>;
}

const PERSONA_ACCESSORS = {
  documento: (persona: PersonaLinea) => persona.documento,
  nombre: (persona: PersonaLinea) => persona.nombre,
  tipo: (persona: PersonaLinea) => persona.tipo,
  cargo: (persona: PersonaLinea) => persona.cargo || '(Vacío)',
  area: (persona: PersonaLinea) => persona.area || '(Vacío)',
  centro_costo: (persona: PersonaLinea) => persona.centro_costo || '(Vacío)',
};

export const PersonasManager: React.FC<Props> = ({
  personas,
  isLoading,
  error,
  onRetry,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const { addNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PersonaLinea>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PersonaLinea | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(200);
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
  } = useColumnFilters(personas, PERSONA_ACCESSORS, 'lineas_personas');

  const columns = useMemo<DataTableColumn<PersonaLinea>[]>(() => [
    { key: 'documento', label: 'Cédula', minWidth: '140px', filterable: true },
    { key: 'nombre', label: 'Nombre completo', minWidth: '200px', flex: true, filterable: true, render: (persona) => (
      <div className="flex items-center gap-2"><Text weight="medium">{persona.nombre}</Text>{persona.tipo !== 'INTERNO' && <Badge variant="warning">{persona.tipo}</Badge>}</div>
    ) },
    { key: 'cargo', label: 'Cargo', minWidth: '150px', filterable: true, render: (persona) => persona.cargo || '-' },
    { key: 'area', label: 'Área', minWidth: '140px', filterable: true, render: (persona) => persona.area || '-' },
    { key: 'centro_costo', label: 'Centro de costo', minWidth: '140px', filterable: true, render: (persona) => persona.centro_costo || '-' },
  ], []);

  const startCreate = () => {
    setIsCreating(true);
    setIsEditing(null);
    setFormData({ tipo: 'INTERNO', documento: '', nombre: '', cargo: '', area: '', centro_costo: '' });
  };

  const startEdit = (persona: PersonaLinea) => {
    setIsEditing(persona.documento);
    setIsCreating(false);
    setFormData(persona);
  };

  const cancelForm = () => {
    setIsEditing(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = async () => {
    if (!formData.documento?.trim() || !formData.nombre?.trim()) {
      addNotification('warning', 'La cédula y el nombre son obligatorios.');
      return;
    }

    setIsProcessing(true);
    try {
      if (isCreating) {
        await onCreate(formData);
        addNotification('success', 'Persona añadida al directorio');
      } else if (isEditing) {
        await onUpdate(isEditing, formData);
        addNotification('success', 'Persona actualizada');
      }
      cancelForm();
    } catch (err: unknown) {
      addNotification('error', err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      await onDelete(deleteTarget.documento);
      addNotification('success', 'Persona eliminada del directorio');
      setDeleteTarget(null);
    } catch (err: unknown) {
      addNotification('error', err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPersonas = filteredData.filter((persona) => !deferredSearch || [
    persona.nombre,
    persona.documento,
    persona.cargo,
    persona.area,
    persona.centro_costo,
  ].some((value) => value?.toLowerCase().includes(deferredSearch)));
  const visiblePersonas = filteredPersonas.slice(0, visibleLimit);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <MaterialCard className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <Title variant="h4" className="flex items-center gap-2">
            <Icon name={Users} className="text-primary" />
            Directorio de Personas
          </Title>
          <Text variant="caption" className="opacity-60">Gestione los empleados y su información de área / centro de costo.</Text>
        </div>
        {!isCreating && !isEditing && (
          <Button variant="primary" onClick={startCreate} icon={Plus} className="rounded-xl px-6">
            Añadir Persona
          </Button>
        )}
      </MaterialCard>

      {(isCreating || isEditing) && (
        <MaterialCard className="p-6 space-y-4">
          <Title variant="h5">{isCreating ? 'Añadir Nueva Persona' : 'Editar Persona'}</Title>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Identificación (Cédula) *"
              value={formData.documento || ''}
              onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
              className="!rounded-xl"
              disabled={!!isEditing} // No permitir cambiar la cédula si estamos editando
            />
            <Input
              label="Nombre Completo *"
              value={formData.nombre || ''}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="!rounded-xl"
            />
            <Select
              label="Tipo de Relación"
              value={formData.tipo || 'INTERNO'}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              options={[
                { label: 'INTERNO', value: 'INTERNO' },
                { label: 'EXTERNO', value: 'EXTERNO' },
                { label: 'PROVEEDOR', value: 'PROVEEDOR' },
              ]}
              className="!rounded-xl"
            />
            <Input
              label="Cargo"
              value={formData.cargo || ''}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              className="!rounded-xl"
            />
            <Input
              label="Área"
              value={formData.area || ''}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="!rounded-xl"
            />
            <Input
              label="Centro de Costo"
              value={formData.centro_costo || ''}
              onChange={(e) => setFormData({ ...formData, centro_costo: e.target.value })}
              className="!rounded-xl"
              placeholder="Ej: CO-1025"
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
            aria-label="Buscar personas"
            placeholder="Buscar por cédula, nombre o cargo..."
            icon={Search}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="max-w-md !rounded-xl"
          />
          <div className="flex items-center gap-3">
            <Text variant="caption" color="text-secondary">
              Mostrando {visiblePersonas.length} de {filteredPersonas.length}
            </Text>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Limpiar filtros ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>
        {error ? (
          <Callout variant="error" title="No fue posible cargar las personas" className="m-6">
            <Text variant="body2">{error}</Text>
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">Reintentar</Button>
          </Callout>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={visiblePersonas}
              keyExtractor={(persona) => persona.documento}
              isLoading={isLoading}
              loadingMessage="Cargando personas..."
              emptyMessage={personas.length === 0 ? 'No hay personas registradas' : 'No se encontraron resultados'}
              maxHeight="max-h-[420px]"
              columnFilters={filters}
              columnOptions={cascadingOptions}
              onFilterChange={setColumnFilter}
              activeSortKey={sortState?.key}
              activeSortDir={sortState?.dir}
              onSort={setSort}
              renderRowActions={(persona) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" icon={Edit2} aria-label={`Editar persona ${persona.nombre}`} disabled={isProcessing} onClick={() => startEdit(persona)} />
                  <Button variant="ghost" size="sm" icon={Trash2} aria-label={`Eliminar persona ${persona.nombre}`} disabled={isProcessing} onClick={() => setDeleteTarget(persona)} />
                </div>
              )}
            />
            {visiblePersonas.length < filteredPersonas.length && (
              <Button
                variant="ghost"
                size="sm"
                className="mx-auto my-3"
                onClick={() => setVisibleLimit((limit) => limit + 200)}
              >
                Cargar más personas
              </Button>
            )}
          </>
        )}
      </MaterialCard>

      <CorporateDeleteConfirmModal
        isOpen={deleteTarget !== null}
        title="¿Eliminar persona?"
        description={deleteTarget ? `Se eliminará ${deleteTarget.nombre}. La operación se bloqueará si tiene líneas asignadas.` : ''}
        isProcessing={isProcessing}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
