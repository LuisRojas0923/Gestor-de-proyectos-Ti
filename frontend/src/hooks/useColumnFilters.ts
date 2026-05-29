import { useState, useMemo, useEffect } from 'react';

type SortState = { key: string; dir: 'asc' | 'desc' | null } | null;

export function useColumnFilters<T>(
  data: T[],
  columnAccessors: Record<string, (row: T) => string | number | null | undefined>,
  storageKey?: string
) {
  const [filters, setFilters] = useState<Record<string, Set<string>>>(() => {
    if (!storageKey) return {};
    try {
      const raw = JSON.parse(localStorage.getItem(`${storageKey}_filters`) ?? '{}') as Record<string, string[]>;
      return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, new Set(v)]));
    } catch { return {}; }
  });

  const [sortState, setSortState] = useState<SortState>(() => {
    if (!storageKey) return null;
    try { return JSON.parse(localStorage.getItem(`${storageKey}_sort`) ?? 'null') as SortState; }
    catch { return null; }
  });

  const [activePopover, setActivePopover] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    const serialized = Object.fromEntries(
      Object.entries(filters).map(([k, v]) => [k, Array.from(v)])
    );
    localStorage.setItem(`${storageKey}_filters`, JSON.stringify(serialized));
  }, [filters, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(`${storageKey}_sort`, JSON.stringify(sortState));
  }, [sortState, storageKey]);

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

  const filteredData = useMemo(() => {
    const filtered = data.filter(row => {
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

    let activeSort = sortState;
    if ((!activeSort || !activeSort.dir) && 'id' in columnAccessors) {
      activeSort = { key: 'id', dir: 'asc' };
    }

    if (!activeSort || !activeSort.dir) return filtered;
    const accessor = columnAccessors[activeSort.key];
    if (!accessor) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(accessor(a) ?? '');
      const bv = String(accessor(b) ?? '');
      return activeSort.dir === 'asc'
        ? av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
        : bv.localeCompare(av, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [data, filters, columnAccessors, sortState]);

  const hasActiveFilter = (key: string) => (filters[key]?.size ?? 0) > 0;
  const activeFilterCount = Object.values(filters).filter(s => s.size > 0).length;

  const toggleOption = (columnKey: string, option: string) => {
    setFilters(prev => {
      const current = new Set(prev[columnKey] || []);
      if (current.has(option)) current.delete(option);
      else current.add(option);
      return { ...prev, [columnKey]: current };
    });
  };

  const selectAll = (columnKey: string) => {
    setFilters(prev => ({ ...prev, [columnKey]: new Set(uniqueValues[columnKey]) }));
  };

  const clearColumnFilter = (columnKey: string) => {
    setFilters(prev => { const next = { ...prev }; delete next[columnKey]; return next; });
  };

  const clearAllFilters = () => setFilters({});

  const setColumnFilter = (columnKey: string, newSet: Set<string>) => {
    setFilters(prev => ({ ...prev, [columnKey]: newSet }));
  };

  const setSort = (key: string, dir: 'asc' | 'desc' | null) => {
    if (dir === null) {
      setSortState(null);
    } else {
      setSortState({ key, dir });
    }
  };

  const clearSort = () => setSortState(null);

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
    sortState,
    setSort,
    clearSort,
  };
}
