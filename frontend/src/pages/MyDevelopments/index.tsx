import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDevelopments } from './hooks/useDevelopments';
import { useReviewedDevelopments } from './hooks/useReviewedDevelopments';
import { useNotifications } from '../../components/notifications/NotificationsContext';
import { DataTable } from '../../components/molecules/DataTable';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { CreateDevelopmentModal } from './CreateDevelopmentModal';
import EditDevelopmentModal from './EditDevelopmentModal';
import { useApi } from '../../hooks/useApi';
import { Button, Text } from '../../components/atoms';
import Modal from '../../components/molecules/Modal';

import { MyDevelopmentsHeader } from './components/MyDevelopmentsHeader';
import { MyDevelopmentsDeleteModal } from './components/MyDevelopmentsDeleteModal';
import {
  getColumns,
  getColumnAccessors,
  getDevelopmentName,
  getDevelopmentStatus,
  getStatusLabel,
  DevelopmentRow,
} from './components/columns';

const MyDevelopments: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/service-portal');
  const { developments, loadDevelopments, loadMore, total, hasMore, loadingMore } = useDevelopments();
  const { reviewedIds, toggle: toggleReviewed, clearAll: clearReviewed, count: reviewedCount } = useReviewedDevelopments();
  const { addNotification } = useNotifications();
  const { delete: apiDelete, get: apiGet, put: apiPut } = useApi();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [editTarget, setEditTarget] = useState<DevelopmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DevelopmentRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => { loadDevelopments(); }, [loadDevelopments]);

  useEffect(() => {
    apiGet('/jerarquia/usuarios-disponibles').then((users: unknown) => {
      if (Array.isArray(users)) {
        setUserMap(new Map((users as { id: string; nombre: string }[]).map((u) => [u.id, u.nombre])));
      }
    }).catch(() => undefined);
  }, [apiGet]);

  const resolveUserName = useCallback((value?: string | null) => {
    if (!value) return undefined;
    if (value.startsWith('USR-')) return userMap.get(value) ?? value;
    return value;
  }, [userMap]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/desarrollos/${deleteTarget.id}`);
      addNotification('success', `Actividad "${getDevelopmentName(deleteTarget)}" eliminada`);
      setDeleteTarget(null);
      loadDevelopments();
    } catch (err) {
      console.error('Error deleting development:', err);
      const msg = err instanceof Error ? err.message : 'Error al eliminar la actividad';
      setErrorMessage(msg);
      setErrorModalOpen(true);
      setDeleteTarget(null); // Cerrar el modal de confirmación
    } finally {
      setDeleteLoading(false);
    }
  };

  const columnAccessors = useMemo(() => getColumnAccessors(resolveUserName, reviewedIds), [resolveUserName, reviewedIds]);

  const {
    filteredData,
    uniqueValues,
    cascadingOptions,
    filters,
    clearAllFilters,
    setColumnFilter,
    activeFilterCount,
    sortState,
    setSort,
  } = useColumnFilters(developments || [], columnAccessors, 'my_developments');

  const columns = useMemo(
    () => getColumns(resolveUserName, { ids: reviewedIds, toggle: toggleReviewed }),
    [resolveUserName, reviewedIds, toggleReviewed]
  );

  const displayData = useMemo(() => {
    if (!peopleSearch.trim()) return filteredData;
    const q = peopleSearch.toLowerCase();
    return filteredData.filter(dev => {
      const authority   = (resolveUserName(dev.authority ?? dev.autoridad) || dev.authority || dev.autoridad || '').toLowerCase();
      const responsible = (resolveUserName(dev.responsible ?? dev.responsable) || dev.responsible || dev.responsable || '').toLowerCase();
      const supervisor  = (resolveUserName(dev.supervisor) || dev.supervisor || '').toLowerCase();
      const analista    = (resolveUserName(dev.analista) || dev.analista || '').toLowerCase();
      return authority.includes(q) || responsible.includes(q) || supervisor.includes(q) || analista.includes(q);
    });
  }, [filteredData, peopleSearch, resolveUserName]);

  const selectedStatus = useMemo(() => {
    const statusFilterSet = filters.status;
    return statusFilterSet && statusFilterSet.size === 1 ? Array.from(statusFilterSet)[0] : null;
  }, [filters.status]);

  const handleStatusSelect = useCallback((status: string | null) => {
    if (!status) {
      setColumnFilter('status', new Set());
    } else {
      const current = filters.status;
      if (current?.has(status) && current.size === 1) {
        setColumnFilter('status', new Set());
      } else {
        setColumnFilter('status', new Set([status]));
      }
    }
  }, [filters.status, setColumnFilter]);

  const dataForCounters = useMemo(() => {
    const filtered = (developments || []).filter(row => {
      for (const [key, selectedValues] of Object.entries(filters)) {
        if (key === 'status') continue;
        if (!selectedValues || selectedValues.size === 0) continue;
        const accessor = columnAccessors[key];
        if (!accessor) continue;
        const rawValue = accessor(row);
        const value = rawValue === null || rawValue === undefined ? '(Vacío)' : String(rawValue);
        if (!selectedValues.has(value)) return false;
      }
      return true;
    });

    if (!peopleSearch.trim()) return filtered;
    const q = peopleSearch.toLowerCase();
    return filtered.filter(dev => {
      const authority   = (resolveUserName(dev.authority ?? dev.autoridad) || dev.authority || dev.autoridad || '').toLowerCase();
      const responsible = (resolveUserName(dev.responsible ?? dev.responsable) || dev.responsible || dev.responsable || '').toLowerCase();
      const supervisor  = (resolveUserName(dev.supervisor) || dev.supervisor || '').toLowerCase();
      const analista    = (resolveUserName(dev.analista) || dev.analista || '').toLowerCase();
      return authority.includes(q) || responsible.includes(q) || supervisor.includes(q) || analista.includes(q);
    });
  }, [developments, filters, columnAccessors, peopleSearch, resolveUserName]);

  const statusGroups = useMemo(() => {
    const counts: Record<string, number> = {
      'En Proceso': 0,
      'Pendiente': 0,
      'Completado': 0,
      'Pausado': 0,
    };
    return dataForCounters.reduce<Record<string, number>>((acc, dev) => {
      const s = getStatusLabel(getDevelopmentStatus(dev)) || 'Sin estado';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, counts);
  }, [dataForCounters]);

  return (
    <div className="space-y-4">
      <MyDevelopmentsHeader
        isPortal={isPortal}
        totalCount={Object.values(statusGroups).reduce((a, b) => a + b, 0)}
        loadedCount={developments.length}
        statusGroups={statusGroups}
        activeFilterCount={activeFilterCount}
        clearAllFilters={clearAllFilters}
        peopleSearch={peopleSearch}
        setPeopleSearch={setPeopleSearch}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        selectedStatus={selectedStatus}
        onStatusSelect={handleStatusSelect}
        reviewedCount={reviewedCount}
        clearReviewed={clearReviewed}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />

      <DataTable<DevelopmentRow>
        columns={columns}
        data={displayData}
        keyExtractor={(dev) => String(dev.id)}
        onRowClick={(dev) => navigate(isPortal ? `/service-portal/desarrollos/${dev.id}?tab=bitacora` : `/developments/${dev.id}?tab=bitacora`)}
        columnFilters={filters}
        columnOptions={cascadingOptions}
        onFilterChange={(key, newSet) => setColumnFilter(key, newSet)}
        activeSortKey={sortState?.key ?? null}
        activeSortDir={sortState?.dir ?? null}
        onSort={setSort}
        actionsMinWidth="90px"
        renderRowActions={(dev) => (
          <>
            {getDevelopmentStatus(dev) === 'Pausado' ? (
              <Button
                variant="custom"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await apiPut(`/desarrollos/${dev.id}`, { estado_general: 'En curso' });
                    addNotification('success', `Actividad "${getDevelopmentName(dev)}" reanudada`);
                    loadDevelopments();
                  } catch (err) {
                    addNotification('error', 'Error al reanudar la actividad');
                  }
                }}
                className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/20 inline-flex items-center justify-center"
                title="Reanudar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </Button>
            ) : (
              (getDevelopmentStatus(dev) === 'En curso' || getDevelopmentStatus(dev) === 'En Proceso' || getDevelopmentStatus(dev) === 'Pendiente') && (
                <Button
                  variant="custom"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await apiPut(`/desarrollos/${dev.id}`, { estado_general: 'Pausado' });
                      addNotification('success', `Actividad "${getDevelopmentName(dev)}" pausada`);
                      loadDevelopments();
                    } catch (err) {
                      addNotification('error', 'Error al pausar la actividad');
                    }
                  }}
                  className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-white transition-all border border-yellow-500/20 inline-flex items-center justify-center"
                  title="Pausar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                </Button>
              )
            )}
            <Button
              variant="custom"
              onClick={(e) => { e.stopPropagation(); setEditTarget(dev); }}
              className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20 inline-flex items-center justify-center"
              title="Actualizar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </Button>
            <Button
              variant="custom"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(dev); }}
              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 inline-flex items-center justify-center"
              title="Eliminar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </Button>
          </>
        )}
        emptyIcon={<Search size={40} className="opacity-40" />}
        emptyMessage="No se encontraron actividades"
        maxHeight="max-h-[calc(100vh-280px)]"
      />

      <CreateDevelopmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={() => { loadDevelopments(); addNotification('success', 'Actividad creada exitosamente'); }}
        darkMode={false}
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
            area_ejecutor: editTarget.area_ejecutor,
          }}
          onClose={() => setEditTarget(null)}
          onSaved={() => { loadDevelopments(); addNotification('success', 'Actividad actualizada exitosamente'); setEditTarget(null); }}
        />
      )}

      <MyDevelopmentsDeleteModal
        isOpen={!!deleteTarget}
        name={deleteTarget ? getDevelopmentName(deleteTarget) : ''}
        deleteLoading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert className="w-5 h-5" />
            <Text as="span" variant="body1" weight="bold" color="inherit">
              Acceso Restringido
            </Text>
          </div>
        }
        size="sm"
      >
        <div className="space-y-4 py-2">
          <Text variant="body2" className="text-gray-700 dark:text-gray-300">
            {errorMessage}
          </Text>
          <div className="flex justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => setErrorModalOpen(false)}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-800 dark:text-gray-200 px-4 py-1.5 text-xs rounded-lg font-medium"
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyDevelopments;
