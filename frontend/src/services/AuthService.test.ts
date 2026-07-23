import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './AuthService';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('AuthService.refreshAccessToken', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('comparte un unico refresh entre solicitudes concurrentes', async () => {
    localStorage.setItem('token', 'token-anterior');
    vi.mocked(axios.post).mockResolvedValue({
      data: { access_token: 'token-renovado' },
    });

    const resultados = await Promise.all([
      AuthService.refreshAccessToken(),
      AuthService.refreshAccessToken(),
      AuthService.refreshAccessToken(),
    ]);

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(resultados).toEqual([
      'token-renovado',
      'token-renovado',
      'token-renovado',
    ]);
    expect(localStorage.getItem('token')).toBe('token-renovado');
  });

  it('no restaura credenciales si ocurre logout durante el refresh', async () => {
    localStorage.setItem('token', 'token-anterior');
    let resolver!: (value: { data: { access_token: string } }) => void;
    vi.mocked(axios.post).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );

    const refresh = AuthService.refreshAccessToken();
    localStorage.removeItem('token');
    resolver({ data: { access_token: 'token-tardio' } });

    await expect(refresh).resolves.toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('libera el single-flight despues de un fallo', async () => {
    localStorage.setItem('token', 'token-anterior');
    vi.mocked(axios.post)
      .mockRejectedValueOnce(new Error('red'))
      .mockResolvedValueOnce({ data: { access_token: 'token-nuevo' } });

    await expect(AuthService.refreshAccessToken()).resolves.toBeNull();
    await expect(AuthService.refreshAccessToken()).resolves.toBe('token-nuevo');
    expect(axios.post).toHaveBeenCalledTimes(2);
  });
});
