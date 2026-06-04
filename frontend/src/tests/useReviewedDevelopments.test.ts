import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useReviewedDevelopments } from '../pages/MyDevelopments/hooks/useReviewedDevelopments';

describe('useReviewedDevelopments', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with an empty set if localStorage is empty', () => {
    const { result } = renderHook(() => useReviewedDevelopments());
    expect(result.current.reviewedIds).toBeInstanceOf(Set);
    expect(result.current.reviewedIds.size).toBe(0);
    expect(result.current.count).toBe(0);
  });

  it('should initialize with values from localStorage', () => {
    localStorage.setItem('my_developments_reviewed', JSON.stringify(['DEV-1', 'DEV-2']));
    const { result } = renderHook(() => useReviewedDevelopments());
    expect(result.current.reviewedIds.has('DEV-1')).toBe(true);
    expect(result.current.reviewedIds.has('DEV-2')).toBe(true);
    expect(result.current.count).toBe(2);
  });

  it('should toggle items and persist to localStorage', () => {
    const { result } = renderHook(() => useReviewedDevelopments());

    act(() => {
      result.current.toggle('DEV-1');
    });

    expect(result.current.reviewedIds.has('DEV-1')).toBe(true);
    expect(result.current.count).toBe(1);
    expect(JSON.parse(localStorage.getItem('my_developments_reviewed') ?? '[]')).toEqual(['DEV-1']);

    act(() => {
      result.current.toggle('DEV-1');
    });

    expect(result.current.reviewedIds.has('DEV-1')).toBe(false);
    expect(result.current.count).toBe(0);
    expect(JSON.parse(localStorage.getItem('my_developments_reviewed') ?? '[]')).toEqual([]);
  });

  it('should clear all items', () => {
    localStorage.setItem('my_developments_reviewed', JSON.stringify(['DEV-1', 'DEV-2']));
    const { result } = renderHook(() => useReviewedDevelopments());

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.reviewedIds.size).toBe(0);
    expect(result.current.count).toBe(0);
    expect(JSON.parse(localStorage.getItem('my_developments_reviewed') ?? '[]')).toEqual([]);
  });
});
