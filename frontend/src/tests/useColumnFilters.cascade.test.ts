import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useColumnFilters } from '../hooks/useColumnFilters';

interface DummyRow {
  id: string;
  pais: string;
  ciudad: string;
}

const mockData: DummyRow[] = [
  { id: '1', pais: 'Colombia', ciudad: 'Bogotá' },
  { id: '2', pais: 'Colombia', ciudad: 'Cali' },
  { id: '3', pais: 'España', ciudad: 'Madrid' },
  { id: '4', pais: 'España', ciudad: 'Barcelona' },
];

const columnAccessors = {
  pais: (row: DummyRow) => row.pais,
  ciudad: (row: DummyRow) => row.ciudad,
};

describe('useColumnFilters cascadingOptions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return all options when no filters are active', () => {
    const { result } = renderHook(() =>
      useColumnFilters<DummyRow>(mockData, columnAccessors, 'test_cascade', true)
    );

    expect(result.current.cascadingOptions.pais).toEqual(['Colombia', 'España']);
    expect(result.current.cascadingOptions.ciudad).toEqual(['Barcelona', 'Bogotá', 'Cali', 'Madrid']);
  });

  it('should restrict other column options in cascade when a filter is active', () => {
    const { result } = renderHook(() =>
      useColumnFilters<DummyRow>(mockData, columnAccessors, 'test_cascade', true)
    );

    act(() => {
      // Filter by pais = Colombia
      result.current.toggleOption('pais', 'Colombia');
    });

    // The cascading options for 'pais' itself should still be all unique values of the column
    // plus current selections so that the user doesn't lose visibility.
    expect(result.current.cascadingOptions.pais).toEqual(['Colombia', 'España']);

    // The cascading options for 'ciudad' should be restricted to cities in Colombia
    expect(result.current.cascadingOptions.ciudad).toEqual(['Bogotá', 'Cali']);
  });

  it('should include currently selected options in cascadingOptions even if they would be filtered out by others', () => {
    const { result } = renderHook(() =>
      useColumnFilters<DummyRow>(mockData, columnAccessors, 'test_cascade', true)
    );

    act(() => {
      // Filter by pais = Colombia
      result.current.toggleOption('pais', 'Colombia');
      // Filter by ciudad = Madrid (which is in Spain, so empty results, but we selected it)
      result.current.toggleOption('ciudad', 'Madrid');
    });

    // cascadingOptions.ciudad should contain Madrid because it is selected, plus others that match pais = Colombia
    expect(result.current.cascadingOptions.ciudad).toContain('Madrid');
    expect(result.current.cascadingOptions.ciudad).toContain('Bogotá');
    expect(result.current.cascadingOptions.ciudad).toContain('Cali');
  });
});
