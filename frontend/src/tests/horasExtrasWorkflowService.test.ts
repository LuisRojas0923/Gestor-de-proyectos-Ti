import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compensarBolsa, listarFestivos, sincronizarFestivos, transicionarCalculo } from '../services/horasExtrasService';
import { API_CONFIG } from '../config/api';

const BASE = `${API_CONFIG.BASE_URL}/novedades-nomina/horas-extras`;
const TOKEN = 'fake-token-123';
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('horasExtrasService workflow y festivos', () => {
  const fetchMock = vi.fn();
  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => { vi.unstubAllGlobals(); fetchMock.mockReset(); });

  it('transiciona un cálculo con su payload completo', async () => {
    fetchMock.mockResolvedValueOnce(response({ calculo_id: 7, estado_nuevo: 'PAGADO', evento_id: 99 }));
    const payload = { estado_destino: 'PAGADO' as const, justificacion: 'liquidado', horas: null, fecha: null };
    const result = await transicionarCalculo(7, payload, TOKEN);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/calculos/7/transicion`);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(payload);
    expect(result.evento_id).toBe(99);
  });

  it('compensa bolsa y propaga conflictos', async () => {
    const payload = { cedula: '12345', horas: 2, fecha: '2026-07-22', calculo_id: null, observaciones: 'x' };
    fetchMock.mockResolvedValueOnce(response({ horas_disponibles_despues: 3 }));
    expect((await compensarBolsa(payload, TOKEN)).horas_disponibles_despues).toBe(3);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/bolsa/compensar`);

    fetchMock.mockResolvedValueOnce(response({ detail: 'Bolsa solo tiene 0.5h disponibles' }, 409));
    await expect(compensarBolsa({ ...payload, horas: 5 }, TOKEN)).rejects.toThrow('Bolsa solo tiene 0.5h disponibles');
  });

  it('lista y sincroniza festivos', async () => {
    fetchMock.mockResolvedValueOnce(response([{ fecha: '2026-01-01', nombre: 'Año Nuevo', fuente: 'LEY_EMILIANI' }]));
    expect(await listarFestivos(2026, 'auto', TOKEN)).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/festivos/2026?fuente=auto`);

    fetchMock.mockResolvedValueOnce(response({ anio: 2026, fuente: 'LEY_EMILIANI', cantidad: 18, calendarific_error: 'API caída', mensaje: 'Sincronizado' }));
    const result = await sincronizarFestivos(2026, TOKEN);
    expect(result.calendarific_error).toBe('API caída');
    expect(fetchMock.mock.calls[1][0]).toBe(`${BASE}/festivos/2026/sincronizar`);
  });
});
