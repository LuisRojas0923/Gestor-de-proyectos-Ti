import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_CONFIG } from '../config/api';
import { buscarOtManoObra } from '../services/horasExtrasService';


describe('buscarOtManoObra', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('consulta el endpoint protegido respaldado por OThorarios', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [], total: 0, limit: 8, offset: 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await buscarOtManoObra('OT 1007', 8, 0, 'token-prueba');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${API_CONFIG.BASE_URL}/novedades-nomina/horas-extras/planificador/ots-horarios?q=OT+1007&limit=8&offset=0`,
    );
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-prueba');
  });
});
