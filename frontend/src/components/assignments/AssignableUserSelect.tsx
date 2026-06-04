import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, X } from 'lucide-react';
import { Text, Input } from '../atoms';
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
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadTeam = async () => {
      setLoading(true);
      try {
        const data = await get('/jerarquia/usuarios-disponibles');
        const teamOptions: AssignableUserOption[] = data ? (data as any[]).map(u => ({
          id: u.id,
          label: u.nombre,
          description: [u.cargo, u.area].filter(Boolean).join(' · '),
          isDirect: true,
        })) : [];
        setOptions(teamOptions);
      } catch (error) {
        console.error('Error loading available users:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    void loadTeam();
  }, [get]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const filteredOptions = search.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.description?.toLowerCase().includes(search.toLowerCase())
      )
    : options;

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
    <div className="relative space-y-1.5" ref={containerRef}>
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
      <div
        role="button"
        tabIndex={loading ? -1 : 0}
        onClick={() => !loading && setOpen(o => !o)}
        onKeyDown={e => {
          if (!loading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen(o => !o);
          }
        }}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2.5 text-xs bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-colors dark:border-[var(--color-border)]/50 ${
          loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          <Text as="span" variant="caption" className={`leading-tight ${selected ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
            {displayLabel}
          </Text>
          {selected?.description && (
            <Text as="span" variant="caption" className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
              {selected.description.replace(/ · (Directo|Indirecto)$/, '')}
            </Text>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-[var(--color-text-secondary)]">
          {value && (
            <button // @audit-ok
              type="button"
              aria-label="Limpiar"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="hover:text-red-400 cursor-pointer p-0.5"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 z-50 min-w-[240px] max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl mt-1 custom-scrollbar">
          {/* Buscador */}
          <div className="sticky top-0 px-2 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]/30 z-10">
            <Input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar o escribir..."
              size="xs"
              className="w-full"
            />
          </div>

          {/* Sin asignar */}
          <button // @audit-ok
            type="button"
            onClick={() => handleSelect('')}
            className={`w-full text-left px-3 py-2 text-xs border-b border-[var(--color-border)]/30 hover:bg-[var(--color-surface-variant)] transition-colors ${!value ? 'bg-[var(--color-surface-variant)]' : ''}`}
          >
            <Text as="span" variant="caption" color="text-secondary">Sin asignar</Text>
          </button>

          {filteredOptions.map(option => (
            <button // @audit-ok
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-[var(--color-border)]/20 last:border-0 hover:bg-[var(--color-surface-variant)] transition-colors flex flex-col gap-0.5 ${value === option.id ? 'bg-[var(--color-primary)]/8' : ''}`}
            >
              <Text as="span" variant="caption" className="font-medium text-[var(--color-text-primary)] leading-tight">
                {option.label}
                {!option.isDirect && (
                  <Text as="span" variant="caption" className="ml-1.5 text-[9px] font-normal text-amber-600 dark:text-amber-400">requiere validación</Text>
                )}
              </Text>
              {option.description && (
                <Text as="span" variant="caption" className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
                  {option.description.replace(/ · (Directo|Indirecto)$/, '')}
                </Text>
              )}
            </button>
          ))}

          {filteredOptions.length === 0 && search.trim() && (
            <div className="px-3 py-4 text-center text-xs text-[var(--color-text-secondary)]">
              Sin resultados para "{search}"
            </div>
          )}
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
