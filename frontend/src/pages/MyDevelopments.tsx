import React, { useEffect, useState } from 'react';
import { Eye, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDevelopments } from './MyDevelopments/hooks/useDevelopments';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { Button, Title, Text } from '../components/atoms';
import { CreateDevelopmentModal } from './MyDevelopments/CreateDevelopmentModal';
import { useColumnFilters } from '../hooks/useColumnFilters';
import { DataTable, DataTableColumn } from '../components/molecules/DataTable';
import { DevelopmentWithCurrentStatus } from '../types';
import { useApi } from '../hooks/useApi';

type DevelopmentRow = DevelopmentWithCurrentStatus & {
  nombre?: string;
  descripcion?: string;
  modulo?: string;
  tipo?: string;
  fecha_inicio?: string;
  fecha_estimada_fin?: string;
  autoridad?: string;
  responsable?: string;
  estado_general?: string;
  porcentaje_progreso?: string | number;
};

const valueOrFallback = (value?: string | number | null) => value ?? 'N/A';

const getDevelopmentName = (dev: DevelopmentRow) => dev.name ?? dev.nombre ?? '';
const getDevelopmentDescription = (dev: DevelopmentRow) => dev.description ?? dev.descripcion;
const getDevelopmentStartDate = (dev: DevelopmentRow) => dev.start_date ?? dev.fecha_inicio;
const getDevelopmentEndDate = (dev: DevelopmentRow) => dev.estimated_end_date ?? dev.fecha_estimada_fin;
const getDevelopmentAuthority = (dev: DevelopmentRow) => dev.authority ?? dev.autoridad;
const getDevelopmentResponsible = (dev: DevelopmentRow) => dev.responsible ?? dev.responsable;
const getDevelopmentStatus = (dev: DevelopmentRow) => {
  const status = dev.general_status ?? dev.estado_general ?? '';
  const progress = Number(dev.stage_progress_percentage ?? dev.porcentaje_progreso ?? 0);
  if (status === 'Pendiente' && progress >= 100) return 'Completado';
  if (status === 'Pendiente' && progress > 0) return 'En proceso';
  return status;
};
const getDevelopmentProgress = (dev: DevelopmentRow) =>
  Number(dev.stage_progress_percentage ?? dev.porcentaje_progreso ?? 0);

const getStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('pendiente')) return 'text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
  if (s.includes('progreso') || s.includes('proceso') || s.includes('curso')) return 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
  if (s.includes('complet')) return 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
  return 'text-gray-800 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
};

const getProgressWidthClass = (p: number) => {
  if (p >= 100) return 'w-full';
  if (p >= 75) return 'w-3/4';
  if (p >= 50) return 'w-1/2';
  if (p >= 25) return 'w-1/4';
  if (p > 0) return 'w-1/12';
  return 'w-0';
};

const MyDevelopments: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/service-portal');
  const { developments, loadDevelopments } = useDevelopments();
  const { addNotification } = useNotifications();
  const { delete: apiDelete, get: apiGet } = useApi();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DevelopmentRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

  useEffect(() => { loadDevelopments(); }, [loadDevelopments]);

  useEffect(() => {
    apiGet('/jerarquia/usuarios-disponibles').then((users: unknown) => {
      if (Array.isArray(users)) {
        setUserMap(new Map((users as { id: string; nombre: string }[]).map((u) => [u.id, u.nombre])));
      }
    }).catch(() => undefined);
  }, [apiGet]);

  const resolveUserName = (value?: string | null) => {
    if (!value) return undefined;
    if (value.startsWith('USR-')) return userMap.get(value) ?? value;
    return value;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/desarrollos/${deleteTarget.id}`);
      addNotification('success', `Actividad "${getDevelopmentName(deleteTarget)}" eliminada`);
      setDeleteTarget(null);
      loadDevelopments();
    } catch {
      addNotification('error', 'Error al eliminar la actividad');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columnAccessors = {
    id:                 (dev: DevelopmentRow) => dev.id,
    name:               getDevelopmentName,
    status:             getDevelopmentStatus,
    start_date:         getDevelopmentStartDate,
    estimated_end_date: getDevelopmentEndDate,
    area_desarrollo:    (dev: DevelopmentRow) => dev.area_desarrollo,
    analista:           (dev: DevelopmentRow) => resolveUserName(dev.analista) ?? dev.analista,
    authority:          (dev: DevelopmentRow) => resolveUserName(getDevelopmentAuthority(dev)) ?? getDevelopmentAuthority(dev),
    responsible:        (dev: DevelopmentRow) => resolveUserName(getDevelopmentResponsible(dev)) ?? getDevelopmentResponsible(dev),
  };

  const {
    filteredData,
    uniqueValues,
    filters,
    clearColumnFilter,
    clearAllFilters,
    setColumnFilter,
    activeFilterCount,
  } = useColumnFilters(developments || [], columnAccessors);

  const columns: DataTableColumn<DevelopmentRow>[] = [
    {
      key: 'id',
      label: 'ID',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="gray" className="font-mono whitespace-nowrap">
          {dev.id}
        </Text>
      ),
    },
    {
      key: 'name',
      label: 'Proyecto',
      flex: true,
      minWidth: '260px',
      filterable: true,
      render: (dev) => {
        const description = getDevelopmentDescription(dev);
        return (
          <div className="min-w-0">
            <Text variant="body2" weight="bold" className="truncate group-hover:text-[var(--color-primary)] transition-colors">
              {getDevelopmentName(dev)}
            </Text>
            {description && (
              <Text as="span" variant="caption" color="text-secondary" className="mt-0.5 block truncate !text-[11px]" title={description}>
                {description}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      centered: true,
      filterable: true,
      render: (dev) => {
        const status = getDevelopmentStatus(dev);
        return (
          <Text as="span" variant="caption" weight="medium" color="inherit"
            className={`inline-flex items-center rounded-full !text-[10px] tracking-wider px-2 py-0.5 ${getStatusColor(status)} shadow-md`}>
            {status}
          </Text>
        );
      },
    },
    {
      key: 'progress',
      label: 'Progreso',
      minWidth: '100px',
      render: (dev) => {
        const progress = getDevelopmentProgress(dev);
        return (
          <div className="flex items-center gap-1.5 w-full">
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full bg-green-500 transition-all duration-500 ${getProgressWidthClass(progress)}`} />
            </div>
            <Text as="span" variant="caption" weight="bold" color="text-secondary" className="w-8 text-right !text-[10px]">
              {progress}%
            </Text>
          </div>
        );
      },
    },
    {
      key: 'start_date',
      label: 'Inicio',
      minWidth: '90px',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="text-secondary" className="!text-[11px]">
          {valueOrFallback(getDevelopmentStartDate(dev))}
        </Text>
      ),
    },
    {
      key: 'estimated_end_date',
      label: 'Fin',
      minWidth: '90px',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="text-secondary" className="!text-[11px]">
          {valueOrFallback(getDevelopmentEndDate(dev))}
        </Text>
      ),
    },
    {
      key: 'area_desarrollo',
      label: 'Área de impacto',
      minWidth: '120px',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]">
          {dev.area_desarrollo ?? 'N/A'}
        </Text>
      ),
    },
    {
      key: 'analista',
      label: 'Líder',
      minWidth: '120px',
      filterable: true,
      render: (dev) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            {(dev.analista ?? 'A')[0].toUpperCase()}
          </div>
          <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]">
            {resolveUserName(dev.analista) ?? 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      key: 'authority',
      label: 'Autoridad',
      minWidth: '110px',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]">
          {valueOrFallback(resolveUserName(getDevelopmentAuthority(dev)))}
        </Text>
      ),
    },
    {
      key: 'responsible',
      label: 'Responsable',
      minWidth: '110px',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]">
          {valueOrFallback(resolveUserName(getDevelopmentResponsible(dev)))}
        </Text>
      ),
    },
  ];

  const renderSlicer = (key: string, label: string) => {
    const options = uniqueValues[key] || [];
    const selectedValues = filters[key] || new Set<string>();
    const hasFilter = selectedValues.size > 0;
    if (options.length === 0) return null;
    return (
      <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[10px] text-[var(--color-text-secondary)]">
            {label}
          </Text>
          {hasFilter && (
            <Button variant="custom" size="xs" onClick={() => clearColumnFilter(key)}
              className="h-auto p-0 text-[9px] font-bold uppercase tracking-wider text-red-500 hover:text-red-600">
              Limpiar
            </Button>
          )}
        </div>
        <div className="flex max-h-20 flex-wrap content-start gap-1.5 overflow-y-auto pr-1 custom-scrollbar">
          {options.map((option) => {
            const isActive = selectedValues.has(option);
            return (
              <Button key={`${key}-${option}`} variant="custom" size="xs"
                onClick={() => {
                  const next = new Set(selectedValues);
                  if (next.has(option)) next.delete(option); else next.add(option);
                  setColumnFilter(key, next);
                }}
                className={`min-h-[28px] rounded-lg border px-2.5 py-1 text-sm font-semibold leading-tight transition-all ${
                  isActive
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-md'
                    : 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'
                }`}
              >
                <Text as="span" variant="body2" weight="semibold" color="inherit" className="leading-tight">
                  {option}
                </Text>
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-4">
          {isPortal && (
            <Button
              variant="ghost"
              onClick={() => navigate('/service-portal/gestion-actividades')}
              className="text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
            >
              ← Volver
            </Button>
          )}
          <Title variant="h1" className="m-0">Gestión de Actividades</Title>
          <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Text variant="caption" weight="bold" className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-800/50">
              {filteredData.length} Actividades
            </Text>
            {activeFilterCount > 0 && (
              <Button variant="custom" size="xs" onClick={clearAllFilters}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-red-500 hover:text-red-600 transition-colors bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/20">
                <RotateCcw size={12} />
                Limpiar {activeFilterCount} filtros
              </Button>
            )}
          </div>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}
          className="shadow-lg shadow-primary-500/20">
          Nueva Actividad
        </Button>
      </div>

      {/* Slicers */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {renderSlicer('status', 'Estado')}
        {renderSlicer('area_desarrollo', 'Área de impacto')}
        {renderSlicer('analista', 'Líder de actividad')}
        {renderSlicer('responsible', 'Responsable')}
      </div>

      {/* Tabla */}
      <DataTable<DevelopmentRow>
        columns={columns}
        data={filteredData}
        keyExtractor={(dev) => String(dev.id)}
        onRowClick={(dev) => navigate(isPortal ? `/service-portal/desarrollos/${dev.id}?tab=bitacora` : `/developments/${dev.id}?tab=bitacora`)}
        columnFilters={filters}
        columnOptions={uniqueValues}
        onFilterChange={(key, newSet) => setColumnFilter(key, newSet)}
        renderRowActions={(dev) => (
          <>
            <Button
              variant="custom"
              onClick={(e) => { e.stopPropagation(); navigate(isPortal ? `/service-portal/desarrollos/${dev.id}?tab=bitacora` : `/developments/${dev.id}?tab=bitacora`); }}
              className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20 inline-flex items-center justify-center"
              title="Ver detalles"
            >
              <Eye size={14} />
            </Button>
            <Button
              variant="custom"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(dev); }}
              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 inline-flex items-center justify-center"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </Button>
          </>
        )}
        actionsMinWidth="100px"
        emptyIcon={<Search size={40} className="opacity-40" />}
        emptyMessage="No se encontraron actividades"
        maxHeight="max-h-[calc(100vh-420px)]"
      />

      <CreateDevelopmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={() => { loadDevelopments(); addNotification('success', 'Actividad creada exitosamente'); }}
        darkMode={document.documentElement.classList.contains('dark')}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="p-6 border-b border-[var(--color-border)]">
              <Title variant="h5" weight="bold">Eliminar actividad</Title>
            </div>
            <div className="p-6 space-y-2">
              <Text variant="body2">
                ¿Estás seguro de que deseas eliminar la actividad{' '}
                <Text as="span" weight="bold">"{getDevelopmentName(deleteTarget)}"</Text>?
              </Text>
              <Text variant="caption" color="text-secondary">
                Esta acción eliminará la actividad y todas sus tareas WBS. No se puede deshacer.
              </Text>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface-variant)] flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
                Cancelar
              </Button>
              <Button
                variant="custom"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDevelopments;
