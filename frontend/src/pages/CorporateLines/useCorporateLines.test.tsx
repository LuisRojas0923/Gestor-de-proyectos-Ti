import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCorporateLines } from './useCorporateLines';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock('../../hooks/useApi', () => ({
  useApi: () => ({ get: api.get, post: api.post, put: api.put, delete: api.del }),
}));

describe('useCorporateLines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('limpia un error anterior cuando el reintento tiene éxito', async () => {
    api.get.mockRejectedValueOnce(new Error('Sin conexión'));
    const { result } = renderHook(() => useCorporateLines());

    await act(async () => result.current.loadData());
    expect(result.current.error).toBe('Sin conexión');

    api.get.mockResolvedValue([]);
    await act(async () => result.current.loadData());

    expect(result.current.error).toBeNull();
    expect(result.current.lines).toEqual([]);
  });
});
