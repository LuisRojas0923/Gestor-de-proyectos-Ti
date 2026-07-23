import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('useApi notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    }));
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
});
