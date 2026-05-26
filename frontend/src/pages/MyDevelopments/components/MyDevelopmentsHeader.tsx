import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Activity, RotateCcw, Users, X, Plus } from 'lucide-react';
import { Button, Title, Text } from '../../../components/atoms';

interface MyDevelopmentsHeaderProps {
  isPortal: boolean;
  totalCount: number;
  statusGroups: Record<string, number>;
  activeFilterCount: number;
  clearAllFilters: () => void;
  peopleSearch: string;
  setPeopleSearch: (val: string) => void;
  onOpenCreateModal: () => void;
}

const getStatusChipClass = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('pendiente')) return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
  if (s.includes('progreso') || s.includes('proceso') || s.includes('curso')) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50';
  if (s.includes('complet')) return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50';
  if (s.includes('cancel')) return 'text-neutral-600 bg-neutral-100 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
  return 'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
};

export const MyDevelopmentsHeader: React.FC<MyDevelopmentsHeaderProps> = ({
  isPortal,
  totalCount,
  statusGroups,
  activeFilterCount,
  clearAllFilters,
  peopleSearch,
  setPeopleSearch,
  onOpenCreateModal,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex-wrap gap-4 md:flex-nowrap">
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
        <Text as="span" className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          <ClipboardList size={11} className="text-neutral-400" />
          <Text as="span" className="font-bold text-[var(--color-text-primary)]">{totalCount}</Text>
          total
        </Text>
        {Object.entries(statusGroups).map(([status, count]) => (
          <Text as="span" key={status} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${getStatusChipClass(status)}`}>
            <Activity size={11} />
            {status}
            <Text as="span" className="font-bold">{count}</Text>
          </Text>
        ))}
        {activeFilterCount > 0 && (
          <Button variant="custom" size="xs" onClick={clearAllFilters}
            className="flex items-center bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/20 text-red-500 hover:text-red-600 transition-colors shadow-sm">
            <Text as="span" variant="caption" color="inherit" className="flex items-center gap-1.5 !text-[10px] !font-bold uppercase tracking-tight">
              <RotateCcw size={11} />
              Limpiar {activeFilterCount} {activeFilterCount === 1 ? 'filtro' : 'filtros'}
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
        <Button variant="primary" icon={Plus} onClick={onOpenCreateModal}
          className="shadow-lg shadow-primary-500/20 shrink-0">
          Nueva Actividad
        </Button>
      </div>
    </div>
  );
};
