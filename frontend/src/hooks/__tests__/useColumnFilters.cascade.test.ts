import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnFilters } from '../useColumnFilters';

interface Row {
  id: string;
  status: string;
  area: string;
  responsable: string;
}

const accessors = {
  id: (r: Row) => r.id,
  status: (r: Row) => r.status,
  area: (r: Row) => r.area,
  responsable: (r: Row) => r.responsable,
};

const data: Row[] = [
  { id: '1', status: 'En Proceso', area: 'TI',         responsable: 'Ana' },
  { id: '2', status: 'En Proceso', area: 'Operaciones',responsable: 'Beto' },
  { id: '3', status: 'En Proceso', area: 'TI',         responsable: 'Cami' },
  { id: '4', status: 'Completada', area: 'Operaciones',responsable: 'Dani' },
];

describe('useColumnFilters — cascada', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sin filtros activos, cascadingOptions == uniqueValues (todas las opciones)', () => {
    const { result } = renderHook(() => useColumnFilters(data, accessors));
    expect(result.current.cascadingOptions.status.sort()).toEqual(['Completada', 'En Proceso']);
    expect(result.current.cascadingOptions.area.sort()).toEqual(['Operaciones', 'TI']);
    expect(result.current.cascadingOptions.responsable.sort()).toEqual(['Ana', 'Beto', 'Cami', 'Dani']);
  });

  it('al filtrar status=En Proceso, el dropdown de area solo muestra TI y Operaciones', () => {
    const { result } = renderHook(() => useColumnFilters(data, accessors));
    act(() => result.current.setColumnFilter('status', new Set(['En Proceso'])));
    expect(result.current.cascadingOptions.area.sort()).toEqual(['Operaciones', 'TI']);
  });

  it('al filtrar status=En Proceso + area=TI, el dropdown de responsable solo muestra Ana y Cami', () => {
    const { result } = renderHook(() => useColumnFilters(data, accessors));
    act(() => result.current.setColumnFilter('status', new Set(['En Proceso'])));
    act(() => result.current.setColumnFilter('area', new Set(['TI'])));
    expect(result.current.cascadingOptions.responsable.sort()).toEqual(['Ana', 'Cami']);
  });

  it('preserva los valores ya seleccionados aunque la cascada los descarte (no perder chips)', () => {
    const { result } = renderHook(() => useColumnFilters(data, accessors));
    // Pre-selecciono responsable=Dani antes de activar el filtro status
    act(() => result.current.setColumnFilter('responsable', new Set(['Dani'])));
    act(() => result.current.setColumnFilter('status', new Set(['En Proceso'])));
    // "Dani" está en status=Completada, no aparece en En Proceso, pero la cascada
    // debe unionarlo para que el chip siga visible y editable.
    expect(result.current.cascadingOptions.responsable).toContain('Dani');
  });

  it('al limpiar todos los filtros, las opciones vuelven a la totalidad', () => {
    const { result } = renderHook(() => useColumnFilters(data, accessors));
    act(() => result.current.setColumnFilter('status', new Set(['En Proceso'])));
    act(() => result.current.setColumnFilter('area', new Set(['TI'])));
    act(() => result.current.clearAllFilters());
    expect(result.current.cascadingOptions.responsable.sort()).toEqual(['Ana', 'Beto', 'Cami', 'Dani']);
  });

  it('cascade=false devuelve uniqueValues aunque haya filtros activos', () => {
    const { result } = renderHook(() => useColumnFilters(data, accessors, undefined, false));
    act(() => result.current.setColumnFilter('status', new Set(['En Proceso'])));
    // Con cascade desactivado, las opciones de area deben seguir siendo todas
    expect(result.current.cascadingOptions.area.sort()).toEqual(['Operaciones', 'TI']);
    expect(result.current.cascadingOptions.responsable.sort()).toEqual(['Ana', 'Beto', 'Cami', 'Dani']);
  });

  it('cascada refleja selección de sub-filtros (acceso por keys independientes)', () => {
    // Simulando que el id de la columna tiene sub-filtros id y tipo
    const accessorsConSub = {
      id: (r: Row) => r.id,
      tipo: (r: Row) => (r.status === 'Completada' ? 'Mejora' : 'Frecuente'),
      status: (r: Row) => r.status,
    };
    const { result } = renderHook(() => useColumnFilters(data, accessorsConSub));
    act(() => result.current.setColumnFilter('status', new Set(['En Proceso'])));
    // tipo solo debe mostrar "Frecuente" (ninguna En Proceso es Mejora)
    expect(result.current.cascadingOptions.tipo).toEqual(['Frecuente']);
  });
});
