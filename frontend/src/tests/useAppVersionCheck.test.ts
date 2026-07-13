import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppVersionCheck } from '../hooks/useAppVersionCheck';
import {
  APP_BUILD_SESSION_KEY,
  isChunkLoadError,
  shouldShowUpdate,
} from '../utils/appVersion';

describe('appVersion utils', () => {
  it('shouldShowUpdate retorna false si buildId remoto coincide', () => {
    expect(shouldShowUpdate('abc123', 'abc123')).toBe(false);
  });

  it('shouldShowUpdate retorna true si buildId remoto difiere', () => {
    expect(shouldShowUpdate('nuevo', 'viejo')).toBe(true);
  });

  it('shouldShowUpdate retorna false sin buildId remoto', () => {
    expect(shouldShowUpdate(undefined, 'viejo')).toBe(false);
  });

  it('isChunkLoadError detecta errores de dynamic import', () => {
    expect(
      isChunkLoadError('Failed to fetch dynamically imported module: /assets/foo.js'),
    ).toBe(true);
    expect(isChunkLoadError('Loading chunk 12 failed.')).toBe(true);
    expect(isChunkLoadError('Error generico')).toBe(false);
  });
});

describe('useAppVersionCheck', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.stubEnv('DEV', false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('no consulta version.json durante desarrollo', () => {
    vi.stubEnv('DEV', true);
    const fetchMock = vi.spyOn(global, 'fetch');

    renderHook(() => useAppVersionCheck());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no muestra actualizacion si version.json coincide con la sesion', async () => {
    sessionStorage.setItem(APP_BUILD_SESSION_KEY, 'build-a');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ buildId: 'build-a' }),
    } as Response);

    const { result } = renderHook(() => useAppVersionCheck());

    await waitFor(() => {
      expect(result.current.updateAvailable).toBe(false);
    });
  });

  it('muestra actualizacion si version.json tiene buildId distinto', async () => {
    sessionStorage.setItem(APP_BUILD_SESSION_KEY, 'build-a');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ buildId: 'build-b' }),
    } as Response);

    const { result } = renderHook(() => useAppVersionCheck());

    await waitFor(() => {
      expect(result.current.updateAvailable).toBe(true);
    });
  });

  it('reloadApp invoca window.location.reload', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadMock },
    });

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
    } as Response);

    const { result } = renderHook(() => useAppVersionCheck());

    act(() => {
      result.current.reloadApp();
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
