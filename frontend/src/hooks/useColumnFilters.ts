import { useState, useMemo } from 'react';

/**
 * useColumnFilters
 * Hook para manejar filtros por columna tipo Excel.
 */
export function useColumnFilters<T>(
  data: T[],
  columnAccessors: Record<string, (row: T) => string | number | null | undefined>
) {
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Extraer valores únicos por columna para las opciones del filtro
  const uniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const [key, accessor] of Object.entries(columnAccessors)) {
      const values = Array.from(new Set(data.map(row => {
        const val = accessor(row);
        return val === null || val === undefined ? '(Vacío)' : String(val);
      }))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      result[key] = values;
    }
    return result;
  }, [data, columnAccessors]);

  // Aplicar filtros sobre los datos original
  const filteredData = useMemo(() => {
    return data.filter(row => {
      for (const [key, selectedValues] of Object.entries(filters)) {
        if (!selectedValues || selectedValues.size === 0) continue;
        const accessor = columnAccessors[key];
        if (!accessor) continue;
        
        const rawValue = accessor(row);
        const value = rawValue === null || rawValue === undefined ? '(Vacío)' : String(rawValue);
        
        if (!selectedValues.has(value)) return false;
      }
      return true;
    });
  }, [data, filters, columnAccessors]);

  const hasActiveFilter = (key: string) => (filters[key]?.size ?? 0) > 0;
  const activeFilterCount = Object.values(filters).filter(s => s.size > 0).length;

  const toggleOption = (columnKey: string, option: string) => {
    setFilters(prev => {
      const current = new Set(prev[columnKey] || []);
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      return { ...prev, [columnKey]: current };
    });
  };

  const selectAll = (columnKey: string) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: new Set(uniqueValues[columnKey])
    }));
  };

  const clearColumnFilter = (columnKey: string) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
  };

  const clearAllFilters = () => setFilters({});

  const setColumnFilter = (columnKey: string, newSet: Set<string>) => {
    setFilters(prev => ({ ...prev, [columnKey]: newSet }));
  };

  return {
    filters,
    filteredData,
    uniqueValues,
    activePopover,
    setActivePopover,
    hasActiveFilter,
    activeFilterCount,
    toggleOption,
    selectAll,
    clearColumnFilter,
    clearAllFilters,
    setColumnFilter,
  };
}
