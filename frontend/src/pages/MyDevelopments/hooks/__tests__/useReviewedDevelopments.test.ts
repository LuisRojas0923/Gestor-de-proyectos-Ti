import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReviewedDevelopments } from '../useReviewedDevelopments';

const STORAGE_KEY = 'my_developments_reviewed';

describe('useReviewedDevelopments', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inicia vacío cuando no hay nada en localStorage', () => {
    const { result } = renderHook(() => useReviewedDevelopments());
    expect(result.current.reviewedIds.size).toBe(0);
    expect(result.current.count).toBe(0);
  });

  it('carga IDs preexistentes desde localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['ACT-001', 'ACT-002']));
    const { result } = renderHook(() => useReviewedDevelopments());
    expect(result.current.reviewedIds.has('ACT-001')).toBe(true);
    expect(result.current.reviewedIds.has('ACT-002')).toBe(true);
    expect(result.current.count).toBe(2);
  });

  it('toggle agrega un ID que no estaba', () => {
    const { result } = renderHook(() => useReviewedDevelopments());
    act(() => result.current.toggle('ACT-001'));
    expect(result.current.reviewedIds.has('ACT-001')).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it('toggle elimina un ID que ya estaba', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['ACT-001']));
    const { result } = renderHook(() => useReviewedDevelopments());
    act(() => result.current.toggle('ACT-001'));
    expect(result.current.reviewedIds.has('ACT-001')).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('persiste en localStorage al cambiar el set', () => {
    const { result } = renderHook(() => useReviewedDevelopments());
    act(() => result.current.toggle('ACT-007'));
    act(() => result.current.toggle('ACT-008'));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    expect(stored.sort()).toEqual(['ACT-007', 'ACT-008']);
  });

  it('clearAll vacía el set y persiste', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['ACT-001', 'ACT-002']));
    const { result } = renderHook(() => useReviewedDevelopments());
    expect(result.current.count).toBe(2);
    act(() => result.current.clearAll());
    expect(result.current.count).toBe(0);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    expect(stored).toEqual([]);
  });

  it('no lanza si localStorage contiene JSON inválido', () => {
    localStorage.setItem(STORAGE_KEY, '{no-es-json');
    const { result } = renderHook(() => useReviewedDevelopments());
    expect(result.current.reviewedIds.size).toBe(0);
  });

  it('no lanza si localStorage contiene algo que no es array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'ACT-001' }));
    const { result } = renderHook(() => useReviewedDevelopments());
    expect(result.current.reviewedIds.size).toBe(0);
  });
});
