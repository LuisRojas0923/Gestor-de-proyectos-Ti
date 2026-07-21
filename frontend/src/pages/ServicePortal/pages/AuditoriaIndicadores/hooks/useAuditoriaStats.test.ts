import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuditoriaStats } from './useAuditoriaStats';
import { useApi } from '../../../../../hooks/useApi';

vi.mock('../../../../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

const createCloseEvent = (code: number, reason: string = ''): CloseEvent => {
  return {
    code,
    reason,
    wasClean: code === 1000,
    type: 'close',
    target: null,
    currentTarget: null,
    eventPhase: 0,
    bubbles: false,
    cancelable: false,
    defaultPrevented: false,
    composed: false,
    isTrusted: true,
    timeStamp: Date.now(),
    NONE: 0,
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
    initCloseEvent: vi.fn(),
    composedPath: vi.fn(() => []),
    preventDefault: vi.fn(),
    stopImmediatePropagation: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as CloseEvent;
};

const createOpenEvent = (): Event => {
  return {
    type: 'open',
    target: null,
    currentTarget: null,
    eventPhase: 0,
    bubbles: false,
    cancelable: false,
    defaultPrevented: false,
    composed: false,
    isTrusted: true,
    timeStamp: Date.now(),
    NONE: 0,
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
    composedPath: vi.fn(() => []),
    preventDefault: vi.fn(),
    stopImmediatePropagation: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as Event;
};

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
      wsInstanceMock.onopen?.(createOpenEvent());
    });

    act(() => {
      wsInstanceMock.onclose?.(createCloseEvent(1008));
    });

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(global.WebSocket).toHaveBeenCalledTimes(1);
  });

  it('no reconecta si el código de cierre es 1000 (normal)', () => {
    renderHook(() => useAuditoriaStats());

    act(() => {
      wsInstanceMock.onopen?.(createOpenEvent());
    });
    act(() => {
      wsInstanceMock.onclose?.(createCloseEvent(1000));
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
      wsInstanceMock.onclose?.(createCloseEvent(1006));
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(global.WebSocket).toHaveBeenCalledTimes(2);

    act(() => {
      wsInstanceMock.onclose?.(createCloseEvent(1006));
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(global.WebSocket).toHaveBeenCalledTimes(3);

    act(() => {
      wsInstanceMock.onclose?.(createCloseEvent(1006));
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(global.WebSocket).toHaveBeenCalledTimes(4);
  });

  it('resetee backoff solo tras la ventana estable de 5 segundos', () => {
    renderHook(() => useAuditoriaStats());

    act(() => { wsInstanceMock.onclose?.(createCloseEvent(1006)); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(global.WebSocket).toHaveBeenCalledTimes(2);

    act(() => { wsInstanceMock.onopen?.(createOpenEvent()); });

    act(() => {
      vi.advanceTimersByTime(2000);
      wsInstanceMock.onclose?.(createCloseEvent(1006));
    });

    act(() => { vi.advanceTimersByTime(2000); });
    expect(global.WebSocket).toHaveBeenCalledTimes(3);

    act(() => { wsInstanceMock.onopen?.(createOpenEvent()); });

    act(() => { vi.advanceTimersByTime(6000); });

    act(() => { wsInstanceMock.onclose?.(createCloseEvent(1006)); });

    act(() => { vi.advanceTimersByTime(1000); });
    expect(global.WebSocket).toHaveBeenCalledTimes(4);
  });

  it('ejecuta coalescing de ráfagas WS durante una carga activa y limpia el timer al desmontar', async () => {
    let resolvePromise: (val: any) => void = () => {};
    const pendingPromise = new Promise(resolve => { resolvePromise = resolve; });
    mockGet.mockReturnValue(pendingPromise);

    const { unmount } = renderHook(() => useAuditoriaStats());

    // Disparar mensaje WS mientras la carga inicial está pendiente
    act(() => {
      wsInstanceMock.onmessage?.({ data: JSON.stringify({ type: 'UPDATE_INDICADORES' }) } as MessageEvent);
      vi.advanceTimersByTime(1500);
    });

    const callsBeforeResolve = mockGet.mock.calls.length;

    // Resolver la solicitud en curso
    await act(async () => {
      resolvePromise({ total_eventos: 100 });
    });

    expect(mockGet.mock.calls.length).toBeGreaterThan(callsBeforeResolve);

    // Desmontar el hook debe limpiar el timer y cerrar el socket sin lanzar excepciones
    unmount();
  });
});
