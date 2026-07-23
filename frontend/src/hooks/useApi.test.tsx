import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addNotification: vi.fn(),
  dispatch: vi.fn(),
}));

vi.mock('../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: mocks.addNotification }),
}));

vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({ dispatch: mocks.dispatch }),
}));

vi.mock('../services/AuthService', () => ({
  AuthService: { refreshAccessToken: vi.fn() },
}));

import { useApi } from './useApi';
import { AuthService } from '../services/AuthService';

describe('useApi notifications', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    }));
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('permite que el consumidor silencie notificaciones obsoletas', async () => {
    const { result } = renderHook(() => useApi());

    await act(async () => {
      await expect(result.current.get('/prueba', { notifyOnError: false }))
        .rejects.toThrow('Error del servidor. Intenta nuevamente más tarde.');
    });

    expect(mocks.addNotification).not.toHaveBeenCalled();
  });

  it('conserva notificaciones de servidor por defecto', async () => {
    const { result } = renderHook(() => useApi());

    await act(async () => {
      await expect(result.current.get('/prueba')).rejects.toThrow(
        'Error del servidor. Intenta nuevamente más tarde.',
      );
    });

    expect(mocks.addNotification).toHaveBeenCalledWith(
      'error',
      'Error del servidor. Intenta nuevamente más tarde.',
    );
  });

  it('cierra el estado y registra solo la ruta saneada ante un 401 terminal', async () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
    localStorage.setItem('token', token);
    vi.mocked(AuthService.refreshAccessToken).mockResolvedValue(null);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({}),
    }));
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useApi());
    const url = `/privado?access_token=${token}#secreto`;

    await act(async () => {
      await expect(result.current.get(url)).resolves.toBeNull();
    });

    expect(consola).toHaveBeenCalledWith('API Error [401] at /privado');
    expect(consola.mock.calls.flat().join(' ')).not.toContain(token);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('No tienes permisos para realizar esta acción.');
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'LOGOUT' });
  });

  it('no filtra el error ni el token cuando el refresh rechaza', async () => {
    const token = 'token-super-secreto';
    const refreshError = 'refresh fallo con credencial-super-secreta';
    localStorage.setItem('token', token);
    vi.mocked(AuthService.refreshAccessToken).mockRejectedValue(new Error(refreshError));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({}),
    }));
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useApi());

    await act(async () => {
      await expect(result.current.get(`/privado?token=${token}#${refreshError}`)).resolves.toBeNull();
    });

    expect(consola).toHaveBeenCalledTimes(1);
    expect(consola).toHaveBeenCalledWith('API Error [401] at /privado');
    expect(consola.mock.calls.flat().join(' ')).not.toContain(token);
    expect(consola.mock.calls.flat().join(' ')).not.toContain(refreshError);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('No tienes permisos para realizar esta acción.');
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'LOGOUT' });
  });
});
