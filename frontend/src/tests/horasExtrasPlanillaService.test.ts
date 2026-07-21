import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_CONFIG } from '../config/api';
import { listarCalculosPlanilla } from '../services/horasExtrasPlanillaService';


describe('listarCalculosPlanilla', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('consulta la lectura protegida con los filtros del cálculo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await listarCalculosPlanilla(
      { cedula: '80167661', anio: 2026, estado: 'CONFIRMADO', limit: 100 },
      'token-prueba',
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${API_CONFIG.BASE_URL}/novedades-nomina/horas-extras/calculos/planilla?cedula=80167661&anio=2026&estado=CONFIRMADO&limit=100`,
    );
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-prueba');
  });

  it('rechaza respuestas HTTP no exitosas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));

    await expect(listarCalculosPlanilla({}, 'token-prueba')).rejects.toThrow('Error HTTP 503');
  });
});
