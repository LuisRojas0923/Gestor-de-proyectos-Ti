import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApi } from '../../../../../hooks/useApi';
import { useAuditoriaStats } from './useAuditoriaStats';

vi.mock('../../../../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useAuditoriaStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta el endpoint de estadísticas con fechas y sin JWT en la carga inicial', async () => {
    const get = vi.fn().mockResolvedValue(null);
    vi.mocked(useApi).mockReturnValue({ get } as never);

    renderHook(() => useAuditoriaStats());

    await waitFor(() => expect(get).toHaveBeenCalledOnce());

    const url = get.mock.calls[0][0] as string;
    expect(url).toContain('/auditoria/estadisticas?');
    expect(url).toContain('fecha_desde=');
    expect(url).toContain('fecha_hasta=');
    expect(url).not.toContain('_t=');
    expect(new URLSearchParams(url.split('?')[1] ?? '').has('token')).toBe(false);
  });

  it('fuerza una URL nueva cuando se solicita actualización manual', async () => {
    const get = vi.fn().mockResolvedValue(null);
    vi.mocked(useApi).mockReturnValue({ get } as never);

    const { result } = renderHook(() => useAuditoriaStats());
    await waitFor(() => expect(get).toHaveBeenCalledOnce());

    await act(async () => {
      await result.current.recargar();
    });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));

    const url = get.mock.calls[1][0] as string;
    expect(url).toContain('_t=');
    expect(new URLSearchParams(url.split('?')[1] ?? '').has('token')).toBe(false);
  });
});
