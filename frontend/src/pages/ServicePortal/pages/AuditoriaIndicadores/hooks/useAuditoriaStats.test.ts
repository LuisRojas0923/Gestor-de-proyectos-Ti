import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuditoriaStats } from './useAuditoriaStats';
import { useApi } from '../../../../../hooks/useApi';

vi.mock('../../../../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useAuditoriaStats WebSocket Reconexión', () => {
  let wsInstanceMock: Partial<WebSocket> & { close: ReturnType<typeof vi.fn> };
  let mockGet = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mockGet = vi.fn().mockResolvedValue({});
    vi.mocked(useApi).mockReturnValue({
      get: mockGet,
      post: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
      loading: false,
      error: null
    } as unknown as ReturnType<typeof useApi>);

    wsInstanceMock = {
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
    };

    global.WebSocket = vi.fn(() => wsInstanceMock) as unknown as typeof WebSocket;
    global.localStorage.setItem('token', 'fake-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('no reconecta si el código de cierre es permanente (1008)', () => {
    renderHook(() => useAuditoriaStats());

    act(() => {
      wsInstanceMock.onopen?.();
    });

    act(() => {
      wsInstanceMock.onclose?.({ code: 1008 });
    });

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(global.WebSocket).toHaveBeenCalledTimes(1);
  });

  it('no reconecta si el código de cierre es 1000 (normal)', () => {
    renderHook(() => useAuditoriaStats());

    act(() => {
      wsInstanceMock.onopen?.();
    });
    act(() => {
      wsInstanceMock.onclose?.({ code: 1000 });
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(global.WebSocket).toHaveBeenCalledTimes(1);
  });

  it('reconecta con exponential backoff para cierres no permanentes', () => {
    renderHook(() => useAuditoriaStats());

    // Cierre 1006 (Abnormal Closure)
    act(() => {
      wsInstanceMock.onclose?.({ code: 1006 });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(global.WebSocket).toHaveBeenCalledTimes(2);

    act(() => {
      wsInstanceMock.onclose?.({ code: 1006 });
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(global.WebSocket).toHaveBeenCalledTimes(3);

    act(() => {
      wsInstanceMock.onclose?.({ code: 1006 });
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(global.WebSocket).toHaveBeenCalledTimes(4);
  });

  it('resetee backoff solo tras la ventana estable de 5 segundos', () => {
    renderHook(() => useAuditoriaStats());

    act(() => { wsInstanceMock.onclose?.({ code: 1006 }); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(global.WebSocket).toHaveBeenCalledTimes(2);

    act(() => { wsInstanceMock.onopen?.(); });

    act(() => {
      vi.advanceTimersByTime(2000);
      wsInstanceMock.onclose?.({ code: 1006 });
    });

    act(() => { vi.advanceTimersByTime(2000); });
    expect(global.WebSocket).toHaveBeenCalledTimes(3);

    act(() => { wsInstanceMock.onopen?.(); });

    act(() => { vi.advanceTimersByTime(6000); });

    act(() => { wsInstanceMock.onclose?.({ code: 1006 }); });

    act(() => { vi.advanceTimersByTime(1000); });
    expect(global.WebSocket).toHaveBeenCalledTimes(4);
  });
});
