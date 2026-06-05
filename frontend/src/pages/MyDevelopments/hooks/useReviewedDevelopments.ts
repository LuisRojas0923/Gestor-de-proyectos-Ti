import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'my_developments_reviewed';

function loadInitial(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function useReviewedDevelopments() {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(reviewedIds)));
    } catch {
      // storage no disponible o cuota llena — se ignora
    }
  }, [reviewedIds]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setReviewedIds(loadInitial());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((id: string) => {
    const key = String(id);
    setReviewedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setReviewedIds(new Set()), []);

  return {
    reviewedIds,
    toggle,
    clearAll,
    count: reviewedIds.size,
  };
}
