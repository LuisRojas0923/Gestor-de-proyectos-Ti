export const FILTROS_PANEL_KEY = 'horas_extras_empleados_panel_filtros';

export type SortState = { key: string; dir: 'asc' | 'desc' | null } | null;

export type FiltrosPanelPersistidos = {
  columnFilters: Record<string, string[]>;
  sortState: SortState;
  busqueda: string;
};

const esObjeto = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const leerSortState = (value: unknown): SortState => {
  if (!esObjeto(value) || typeof value.key !== 'string') return null;
  if (value.dir !== 'asc' && value.dir !== 'desc' && value.dir !== null) return null;
  return { key: value.key, dir: value.dir };
};

const leerColumnFilters = (value: unknown): Record<string, string[]> => {
  if (!esObjeto(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
      .map(([key, values]) => [key, values.filter((item): item is string => typeof item === 'string')]),
  );
};

export const leerFiltrosPanel = (): FiltrosPanelPersistidos | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(FILTROS_PANEL_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!esObjeto(parsed)) return null;
    return {
      columnFilters: leerColumnFilters(parsed.columnFilters),
      sortState: leerSortState(parsed.sortState),
      busqueda: typeof parsed.busqueda === 'string' ? parsed.busqueda : '',
    };
  } catch {
    return null;
  }
};

export const serializarColumnFilters = (filters: Record<string, Set<string>>): Record<string, string[]> => {
  return Object.fromEntries(Object.entries(filters).map(([key, filter]) => [key, Array.from(filter)]));
};

export const restaurarColumnFilters = (filters: Record<string, string[]>): Record<string, Set<string>> => {
  return Object.fromEntries(Object.entries(filters).map(([key, values]) => [key, new Set(values)]));
};
