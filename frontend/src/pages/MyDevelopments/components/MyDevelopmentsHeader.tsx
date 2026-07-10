import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Activity, RotateCcw, Users, X, Plus, CheckCheck, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button, Title, Text } from '../../../components/atoms';

interface MyDevelopmentsHeaderProps {
  isPortal: boolean;
  totalCount: number;
  loadedCount: number;
  statusGroups: Record<string, number>;
  activeFilterCount: number;
  clearAllFilters: () => void;
  peopleSearch: string;
  setPeopleSearch: (val: string) => void;
  onOpenCreateModal: () => void;
  selectedStatus: string | null;
  onStatusSelect: (status: string | null) => void;
  reviewedCount: number;
  clearReviewed: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

const getStatusChipClass = (status: string, isSelected: boolean, hasActiveFilter: boolean) => {
  const s = status.toLowerCase();
  let baseColorClass = '';
  if (s.includes('pendiente')) baseColorClass = 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/60';
  else if (s.includes('progreso') || s.includes('proceso') || s.includes('curso')) baseColorClass = 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800/60';
  else if (s.includes('complet')) baseColorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/60';
  else if (s.includes('paus')) baseColorClass = 'text-violet-700 bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/60';
  else if (s.includes('anulad') || s.includes('cancel')) baseColorClass = 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/70';
  else baseColorClass = 'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';

  const interactionClass = isSelected
    ? 'ring-2 ring-[var(--color-primary)]/50 border-[var(--color-primary)] font-bold scale-[1.02]'
    : hasActiveFilter
      ? 'opacity-55 hover:opacity-100 scale-95'
      : 'hover:scale-[1.02]';

  return `inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all duration-200 active:scale-95 cursor-pointer focus:outline-none ${baseColorClass} ${interactionClass}`;
};

export const MyDevelopmentsHeader: React.FC<MyDevelopmentsHeaderProps> = ({
  isPortal,
  totalCount,
  loadedCount,
  statusGroups,
  activeFilterCount,
  clearAllFilters,
  peopleSearch,
  setPeopleSearch,
  onOpenCreateModal,
  selectedStatus,
  onStatusSelect,
  reviewedCount,
  clearReviewed,
  hasMore,
  loadingMore,
  onLoadMore,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex-wrap gap-4 md:flex-nowrap">
      <div className="flex items-center gap-3 flex-wrap">
        {isPortal && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/service-portal/gestion-actividades')}
            className="hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 m-0">Gestión de Actividades</Title>
        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
        {/* Stats chips */}
        <button // @audit-ok
          type="button"
          onClick={() => onStatusSelect(null)}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800/60 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer focus:outline-none
            ${!selectedStatus
              ? 'ring-2 ring-[var(--color-primary)]/50 border-[var(--color-primary)] font-bold scale-[1.02]'
              : 'opacity-55 hover:opacity-100 scale-95'}`}
        >
          <ClipboardList size={11} />
          <Text as="span" color="inherit" className="font-bold">{totalCount}</Text>
          total
        </button>
        {Object.entries(statusGroups).map(([status, count]) => {
          const isSelected = selectedStatus === status;
          const hasActiveFilter = !!selectedStatus;
          return (
            <button // @audit-ok
              type="button"
              key={status}
              onClick={() => onStatusSelect(status)}
              className={getStatusChipClass(status, isSelected, hasActiveFilter)}
            >
              <Activity size={11} />
              {status}
              <Text as="span" color="inherit" className="font-bold">{count}</Text>
            </button>
          );
        })}
        {activeFilterCount > 0 && (
          <Button variant="custom" size="xs" onClick={clearAllFilters}
            className="flex items-center bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/20 text-red-500 hover:text-red-600 transition-colors shadow-sm">
            <Text as="span" variant="caption" color="inherit" className="flex items-center gap-1.5 !text-[10px] !font-bold uppercase tracking-tight">
              <RotateCcw size={11} />
              Limpiar {activeFilterCount} {activeFilterCount === 1 ? 'filtro' : 'filtros'}
            </Text>
          </Button>
        )}
        {reviewedCount > 0 && (
          <Button variant="custom" size="xs" onClick={clearReviewed}
            className="flex items-center bg-amber-50 dark:bg-amber-900/10 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 hover:text-amber-800 transition-colors shadow-sm">
            <Text as="span" variant="caption" color="inherit" className="flex items-center gap-1.5 !text-[10px] !font-bold uppercase tracking-tight">
              <CheckCheck size={11} />
              Borrar {reviewedCount} {reviewedCount === 1 ? 'check' : 'checks'}
            </Text>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end">
        <div className="relative flex-1 md:flex-initial">
          <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input // @audit-ok
            type="text"
            value={peopleSearch}
            onChange={e => setPeopleSearch(e.target.value)}
            placeholder="Autoridad, líder, supervisor o ejecutor..."
            className="w-full md:w-56 pl-8 pr-7 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 transition"
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
        {hasMore && (
          <Button
            variant="custom"
            onClick={onLoadMore}
            disabled={loadingMore}
            icon={ChevronDown}
            title={loadingMore ? 'Cargando...' : `Cargar más (mostrando ${loadedCount} de ${totalCount})`}
            className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-all px-3 py-2 text-sm rounded-lg font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loadingMore ? 'Cargando...' : `Cargar más (${loadedCount} de ${totalCount})`}
          </Button>
        )}
        <Button variant="primary" icon={Plus} onClick={onOpenCreateModal}
          className="shadow-lg shadow-primary-500/20 shrink-0">
          Nueva Actividad
        </Button>
      </div>
    </div>
  );
};
