import React, { useEffect, useState, useMemo } from 'react';
import { Pencil, Plus, RotateCcw, Search, Trash2, Users, X, Activity, ClipboardList } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDevelopments } from './MyDevelopments/hooks/useDevelopments';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { Button, Title, Text } from '../components/atoms';
import { DataTable, DataTableColumn } from '../components/molecules/DataTable';
import { useColumnFilters } from '../hooks/useColumnFilters';
import { CreateDevelopmentModal } from './MyDevelopments/CreateDevelopmentModal';
import EditDevelopmentModal from './MyDevelopments/EditDevelopmentModal';
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
  autoridad_id?: string;
  responsable?: string;
  responsable_id?: string;
  estado_general?: string;
  porcentaje_progreso?: string | number;
  area_desarrollo?: string;
  analista?: string;
  supervisor?: string;
};

const valueOrFallback = (value?: string | number | null) => value ?? 'N/A';

const getDevelopmentName = (dev: DevelopmentRow) => dev.name ?? dev.nombre ?? '';
const getDevelopmentDescription = (dev: DevelopmentRow) => dev.description ?? dev.descripcion;
const getDevelopmentStartDate = (dev: DevelopmentRow) => dev.start_date ?? dev.fecha_inicio;
const getDevelopmentEndDate = (dev: DevelopmentRow) => dev.estimated_end_date ?? dev.fecha_estimada_fin;
const getDevelopmentAuthority = (dev: DevelopmentRow) => dev.authority ?? dev.autoridad;
const getDevelopmentResponsible = (dev: DevelopmentRow) => dev.responsible ?? dev.responsable;
const getDevelopmentStatus = (dev: DevelopmentRow) => {
  const progress = Number(dev.stage_progress_percentage ?? dev.porcentaje_progreso ?? 0);
  if (progress >= 100) return 'Completado';
  if (progress > 0) return 'En proceso';
  return 'Pendiente';
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

const getStatusChipClass = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('pendiente')) return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
  if (s.includes('progreso') || s.includes('proceso') || s.includes('curso')) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50';
  if (s.includes('complet')) return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50';
  if (s.includes('cancel')) return 'text-neutral-600 bg-neutral-100 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
  return 'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
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
  const { delete: apiDelete, get: apiGet, put: apiPut } = useApi();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [editTarget, setEditTarget] = useState<DevelopmentRow | null>(null);
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

  const columnAccessors = useMemo(() => ({
    id:                 (dev: DevelopmentRow) => String(dev.id),
    name:               getDevelopmentName,
    status:             getDevelopmentStatus,
    start_date:         getDevelopmentStartDate,
    estimated_end_date: getDevelopmentEndDate,
    area_desarrollo:    (dev: DevelopmentRow) => dev.area_desarrollo || '(Vacío)',
    analista:           (dev: DevelopmentRow) => resolveUserName(dev.analista) || dev.analista || '(Sin asignar)',
    supervisor:         (dev: DevelopmentRow) => resolveUserName(dev.supervisor) || dev.supervisor || '(Sin asignar)',
    authority:          (dev: DevelopmentRow) => resolveUserName(getDevelopmentAuthority(dev)) || getDevelopmentAuthority(dev) || '(Sin asignar)',
    responsible:        (dev: DevelopmentRow) => resolveUserName(getDevelopmentResponsible(dev)) || getDevelopmentResponsible(dev) || '(Sin asignar)',
  }), [resolveUserName]);

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
      minWidth: '360px',
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
      minWidth: '80px',
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
      minWidth: '80px',
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
      minWidth: '100px',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]">
          {dev.area_desarrollo ?? 'N/A'}
        </Text>
      ),
    },
    {
      key: 'authority',
      label: 'Autoridad',
      minWidth: '90px',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]">
          {valueOrFallback(resolveUserName(getDevelopmentAuthority(dev)))}
        </Text>
      ),
    },
    {
      key: 'responsible',
      label: 'Líder',
      minWidth: '90px',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]">
          {valueOrFallback(resolveUserName(getDevelopmentResponsible(dev)))}
        </Text>
      ),
    },
    {
      key: 'supervisor',
      label: 'Supervisor',
      minWidth: '90px',
      filterable: true,
      render: (dev) => (
        <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]">
          {valueOrFallback(resolveUserName(dev.supervisor))}
        </Text>
      ),
    },
    {
      key: 'analista',
      label: 'Ejecutor',
      minWidth: '90px',
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
  ];

  const displayData = useMemo(() => {
    if (!peopleSearch.trim()) return filteredData;
    const q = peopleSearch.toLowerCase();
    return filteredData.filter(dev => {
      const authority   = (resolveUserName(getDevelopmentAuthority(dev)) || getDevelopmentAuthority(dev) || '').toLowerCase();
      const responsible = (resolveUserName(getDevelopmentResponsible(dev)) || getDevelopmentResponsible(dev) || '').toLowerCase();
      const supervisor  = (resolveUserName(dev.supervisor) || dev.supervisor || '').toLowerCase();
      const analista    = (resolveUserName(dev.analista) || dev.analista || '').toLowerCase();
      return authority.includes(q) || responsible.includes(q) || supervisor.includes(q) || analista.includes(q);
    });
  }, [filteredData, peopleSearch, resolveUserName]);

  const statusGroups = useMemo(() =>
    displayData.reduce<Record<string, number>>((acc, dev) => {
      const s = getDevelopmentStatus(dev) || 'Sin estado';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {}),
  [displayData]);

  const toggleOption = (key: string, option: string) => {
    const selected = filters[key] || new Set<string>();
    const next = new Set(selected);
    if (next.has(option)) next.delete(option); else next.add(option);
    setColumnFilter(key, next);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
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
          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
          {/* Stats chips */}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            <ClipboardList size={11} className="text-neutral-400" />
            <span className="font-bold text-[var(--color-text-primary)]">{displayData.length}</span>
            total
          </span>
          {Object.entries(statusGroups).map(([status, count]) => (
            <span key={status} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${getStatusChipClass(status)}`}>
              <Activity size={11} />
              {status}
              <span className="font-bold">{count}</span>
            </span>
          ))}
          {activeFilterCount > 0 && (
            <Button variant="custom" size="xs" onClick={clearAllFilters}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-red-500 hover:text-red-600 transition-colors bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/20">
              <RotateCcw size={12} />
              Limpiar {activeFilterCount} filtros
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input // @audit-ok
              type="text"
              value={peopleSearch}
              onChange={e => setPeopleSearch(e.target.value)}
              placeholder="Autoridad, líder, supervisor o ejecutor..."
              className="w-56 pl-8 pr-7 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 transition"
            />
            {peopleSearch && (
              <button // @audit-ok
                onClick={() => setPeopleSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}
            className="shadow-lg shadow-primary-500/20">
            Nueva Actividad
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <DataTable<DevelopmentRow>
        columns={columns}
        data={displayData}
        keyExtractor={(dev) => String(dev.id)}
        onRowClick={(dev) => navigate(isPortal ? `/service-portal/desarrollos/${dev.id}?tab=bitacora` : `/developments/${dev.id}?tab=bitacora`)}
        columnFilters={filters}
        columnOptions={uniqueValues}
        onFilterChange={(key, newSet) => setColumnFilter(key, newSet)}
        renderRowActions={(dev) => (
          <>
            <Button
              variant="custom"
              onClick={(e) => { e.stopPropagation(); setEditTarget(dev); }}
              className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20 inline-flex items-center justify-center"
              title="Actualizar"
            >
              <Pencil size={14} />
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
        actionsMinWidth="120px"
        emptyIcon={<Search size={40} className="opacity-40" />}
        emptyMessage="No se encontraron actividades"
        maxHeight="max-h-[calc(100vh-420px)]"
      />

        <CreateDevelopmentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSaved={() => { loadDevelopments(); addNotification('success', 'Actividad creada exitosamente'); }}
        />

      {editTarget && (
        <EditDevelopmentModal
          development={{
            id: editTarget.id,
            name: editTarget.name ?? editTarget.nombre,
            descripcion: editTarget.description ?? editTarget.descripcion,
            modulo: editTarget.modulo,
            tipo: editTarget.tipo,
            fecha_inicio: editTarget.start_date ?? editTarget.fecha_inicio,
            fecha_estimada_fin: editTarget.estimated_end_date ?? editTarget.fecha_estimada_fin,
            autoridad: editTarget.authority ?? editTarget.autoridad,
            autoridad_id: editTarget.authority_id,
            responsible: editTarget.responsible ?? editTarget.responsable,
            responsible_id: editTarget.responsible_id,
            analista: editTarget.analista,
            analista_id: editTarget.analista_id,
            supervisor: editTarget.supervisor,
            area_desarrollo: editTarget.area_desarrollo,
          }}
          onClose={() => setEditTarget(null)}
          onSaved={() => { loadDevelopments(); addNotification('success', 'Actividad actualizada exitosamente'); setEditTarget(null); }}
        />
      )}

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
