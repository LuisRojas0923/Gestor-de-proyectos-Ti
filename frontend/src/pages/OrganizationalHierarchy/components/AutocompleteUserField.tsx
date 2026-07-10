import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Button, Input, Text } from '../../../components/atoms';
import { HierarchyUser } from '../../../types/hierarchy';

export const AutocompleteUserField: React.FC<{
  label: string;
  value: string;
  onChange: (id: string) => void;
  users: HierarchyUser[];
  disabled?: boolean;
  excludeId?: string;
  compact?: boolean;
}> = ({ label, value, onChange, users, disabled, excludeId, compact }) => {
  const [open, setOpen] = useState(false);
  const [nombreInput, setNombreInput] = useState('');
  const [cedulaInput, setCedulaInput] = useState('');
  const [filterBy, setFilterBy] = useState<'nombre'|'cedula'>('nombre');
  const containerRef = useRef<HTMLDivElement>(null);

  const availableUsers = useMemo(() => users.filter((u) => u.id !== excludeId), [users, excludeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const u = availableUsers.find((u) => u.id === value);
    setNombreInput(u?.nombre || '');
    setCedulaInput(u?.cedula || '');
  }, [value, availableUsers]);

  const filtered = availableUsers.filter((u) => {
    if (filterBy === 'cedula') return (u.cedula || '').includes(cedulaInput.trim());
    return u.nombre.toLowerCase().includes(nombreInput.trim().toLowerCase());
  }).slice(0, 50);

  const select = (user: HierarchyUser) => {
    setNombreInput(user.nombre);
    setCedulaInput(user.cedula || '');
    setOpen(false);
    onChange(user.id);
  };

  const clear = () => {
    setNombreInput('');
    setCedulaInput('');
    onChange('');
  };

  return (
    <div ref={containerRef} className={`${compact ? 'flex items-center gap-2' : 'space-y-1'}`}>
      <Text variant="caption" weight="bold" color="text-secondary" className={`uppercase tracking-wide shrink-0 ${compact ? '!text-[9px] w-14' : ''}`}>{label}</Text>
      <div className="flex flex-1 gap-2">
        <div className="w-24 shrink-0">
          <Input
            value={cedulaInput}
            disabled={disabled}
            placeholder="Cédula..."
            onChange={(e) => { setCedulaInput(e.target.value); setFilterBy('cedula'); setOpen(true); if (!e.target.value) clear(); }}
            onFocus={() => { setFilterBy('cedula'); setOpen(true); }}
            className="h-8 text-xs"
            size="xs"
          />
        </div>
        <div className="relative flex-1">
          <Input
            value={nombreInput}
            disabled={disabled}
            placeholder="Nombre del empleado..."
            onChange={(e) => { setNombreInput(e.target.value); setFilterBy('nombre'); setOpen(true); if (!e.target.value) clear(); }}
            onFocus={() => { setFilterBy('nombre'); setOpen(true); }}
            className="h-8 text-xs"
            size="xs"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
              {filtered.map((user) => (
                <Button
                  key={user.id}
                  variant="custom"
                  className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-primary)]/10 transition-colors border-b border-[var(--color-border)] last:border-0"
                  onMouseDown={() => select(user)}
                >
                  <Text variant="body2" weight="semibold" color="text-primary">{user.nombre}</Text>
                  <Text variant="caption" color="text-secondary">{user.cedula} · {user.cargo || user.rol}</Text>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
