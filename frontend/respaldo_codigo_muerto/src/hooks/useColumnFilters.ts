import { useState, useMemo } from 'react';

export function useColumnFilters<T>(data: T[], columnAccessors: Record<string, (row: T) => string>) {
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Extraer valores únicos por columna
  const uniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const [key, accessor] of Object.entries(columnAccessors)) {
      const values = [...new Set(data.map(row => accessor(row) || '').filter(Boolean))].sort();
      result[key] = values;
    }
    return result;
  }, [data, columnAccessors]);

  // Aplicar filtros sobre los datos
  const filteredData = useMemo(() => {
    return data.filter(row => {
      for (const [key, selectedValues] of Object.entries(filters)) {
        if (selectedValues.size === 0) continue; // Sin filtro = mostrar todo
        const accessor = columnAccessors[key];
        if (!accessor) continue;
        const value = accessor(row) || '';
        if (!selectedValues.has(value)) return false;
      }
      return true;
    });
  }, [data, filters, columnAccessors]);

  const toggleFilter = (key: string) => {
    setActivePopover(prev => (prev === key ? null : key));
  };

  const closePopover = () => {
    setActivePopover(null);
  };

  const handleSelectionChange = (key: string, newSelection: Set<string>) => {
    setFilters(prev => ({
      ...prev,
      [key]: newSelection
    }));
  };

  const hasActiveFilter = (key: string) => (filters[key]?.size ?? 0) > 0;
  const activeFilterCount = Object.values(filters).filter(s => s.size > 0).length;

  const clearAllFilters = () => setFilters({});

  return {
    filters,
    setFilters,
    filteredData,
    uniqueValues,
    activePopover,
    toggleFilter,
    closePopover,
    handleSelectionChange,
    hasActiveFilter,
    activeFilterCount,
    clearAllFilters,
  };
}
