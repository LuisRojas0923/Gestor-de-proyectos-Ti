import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, X } from 'lucide-react';
import { Text } from '../atoms';
import { useApi } from '../../hooks/useApi';
import { useAppContext } from '../../context/AppContext';
import { AssignableUserOption, flattenHierarchy, HierarchyNode } from '../../types/hierarchy';

interface AssignableUserSelectProps {
  label: string;
  value?: string;
  onChange: (userId: string) => void;
  helperText?: string;
}

export const AssignableUserSelect: React.FC<AssignableUserSelectProps> = ({
  label,
  value,
  onChange,
  helperText,
}) => {
  const { get } = useApi<HierarchyNode[]>();
  const { state } = useAppContext();
  const [options, setOptions] = useState<AssignableUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTeam = async () => {
      setLoading(true);
      try {
        const data = await get('/jerarquia/mi-equipo');
        const teamOptions = data ? flattenHierarchy(data) : [];
        const currentUser = state.user;
        if (currentUser && !teamOptions.some(o => o.id === currentUser.id)) {
          teamOptions.unshift({
            id: currentUser.id,
            label: currentUser.name,
            description: [currentUser.cargo, currentUser.area].filter(Boolean).join(' · '),
            isDirect: true,
          });
        }
        setOptions(teamOptions);
      } catch (error) {
        console.error('Error loading hierarchy team:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    void loadTeam();
  }, [get, state.user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.id === value);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const displayLabel = loading
    ? 'Cargando equipo...'
    : selected
    ? selected.label
    : 'Sin asignar';

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <div className="flex items-baseline gap-2 mb-1">
          <Text as="label" variant="body2" weight="medium" color="text-primary">
            {label}
          </Text>
          {helperText && (
            <Text variant="caption" color="text-secondary">{helperText}</Text>
          )}
        </div>
      )}

      {/* Trigger */}
      <button // @audit-ok
        type="button"
        disabled={loading}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2.5 text-xs bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:border-[var(--color-border)]/50"
      >
        <span className="flex flex-col items-start gap-0.5 min-w-0">
          <span className={`leading-tight ${selected ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
            {displayLabel}
          </span>
          {selected?.description && (
            <span className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
              {selected.description.replace(/ · (Directo|Indirecto)$/, '')}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0 text-[var(--color-text-secondary)]">
          {value && (
            <span // @audit-ok
              role="button"
              aria-label="Limpiar"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="hover:text-red-400 cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-[--trigger-w] min-w-[240px] max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl mt-1 custom-scrollbar"
          style={{ width: containerRef.current?.offsetWidth }}
        >
          {/* Sin asignar */}
          <button // @audit-ok
            type="button"
            onClick={() => handleSelect('')}
            className={`w-full text-left px-3 py-2 text-xs border-b border-[var(--color-border)]/30 hover:bg-[var(--color-surface-variant)] transition-colors ${!value ? 'bg-[var(--color-surface-variant)]' : ''}`}
          >
            <span className="text-[var(--color-text-secondary)]">Sin asignar</span>
          </button>

          {options.map(option => (
            <button // @audit-ok
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-[var(--color-border)]/20 last:border-0 hover:bg-[var(--color-surface-variant)] transition-colors flex flex-col gap-0.5 ${value === option.id ? 'bg-[var(--color-primary)]/8' : ''}`}
            >
              <span className="text-xs font-medium text-[var(--color-text-primary)] leading-tight">
                {option.label}
                {!option.isDirect && (
                  <span className="ml-1.5 text-[9px] font-normal text-amber-600 dark:text-amber-400">requiere validación</span>
                )}
              </span>
              {option.description && (
                <span className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
                  {option.description.replace(/ · (Directo|Indirecto)$/, '')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && !selected.isDirect && (
        <div className="flex items-start gap-2 rounded-xl border border-yellow-300/50 bg-yellow-50 px-3 py-2 text-yellow-800 dark:bg-yellow-900/10 dark:text-yellow-300">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <Text variant="caption" color="inherit">
            Esta asignación es indirecta y quedará pendiente de aprobación por el superior directo del ejecutor.
          </Text>
        </div>
      )}
    </div>
  );
};
