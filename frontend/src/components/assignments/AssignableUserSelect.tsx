import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Select, Text } from '../atoms';
import { useApi } from '../../hooks/useApi';
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
  const [options, setOptions] = useState<AssignableUserOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTeam = async () => {
      setLoading(true);
      try {
        const data = await get('/jerarquia/mi-equipo');
        setOptions(data ? flattenHierarchy(data) : []);
      } catch (error) {
        console.error('Error loading hierarchy team:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    void loadTeam();
  }, [get]);

  const selected = options.find((option) => option.id === value);
  const selectOptions = [
    { value: '', label: loading ? 'Cargando equipo...' : 'Sin asignar' },
    ...options.map((option) => ({
      value: option.id,
      label: `${option.label}${option.isDirect ? '' : ' · requiere validación'}`,
    })),
  ];

  return (
    <div className="space-y-2">
      <Select
        label={label}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        options={selectOptions}
        disabled={loading}
        helperText={helperText}
      />

      {selected && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/60 px-3 py-2">
          <Text variant="caption" color="text-secondary">
            {selected.description}
          </Text>
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
