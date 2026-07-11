import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aplicarPlantilla, guardarRelaciones, listarEmpleadosGestor, listarPlantillas, serializarFiltrosEmpleados } from '../services/horariosRelacionesService';

const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('horariosRelacionesService', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchMock); localStorage.setItem('token', 'token-test'); });
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); fetchMock.mockReset(); });

  it('serializa semana, paginación, orden y filtros multivalor', () => {
    const query = serializarFiltrosEmpleados({ anio: 2026, semana_iso: 28, areas: ['Norte', 'Sur'], orden: 'nombre', direccion: 'desc', limit: 25, offset: 50 });
    expect(query).toContain('anio=2026');
    expect(query).toContain('semana_iso=28');
    expect(query).toContain('areas=Norte&areas=Sur');
    expect(query).toContain('offset=50');
  });

  it('codifica gestor y envía filtros administrativos', async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [], total: 0, limit: 25, offset: 0, facetas: {} }));
    await listarEmpleadosGestor('gestor / 1', { anio: 2026, semana_iso: 28, limit: 25, offset: 0 });
    expect(fetchMock.mock.calls[0][0]).toContain('/alcance-empleados/gestores/gestor%20%2F%201/empleados?');
  });

  it('serializa solicitud id en operaciones atómicas', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ agregadas: 1, reactivadas: 0, desactivadas: 0, sin_cambio: 0 }))
      .mockResolvedValueOnce(response({ aplicacion_id: 'a1', cantidad_empleados: 1, estado: 'APLICADA' }));
    await guardarRelaciones('g1', { solicitud_id: 'uuid-1', cedulas_agregar: ['10'], cedulas_quitar: [] });
    await aplicarPlantilla('p1', { solicitud_id: 'uuid-2', cedulas: ['10'] });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).solicitud_id).toBe('uuid-1');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ solicitud_id: 'uuid-2', cedulas: ['10'] });
  });

  it('solicita inactivas con el nombre de parámetro del backend', async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [], total: 0, limit: 12, offset: 0 }));
    await listarPlantillas({ incluir_inactivas: true, limit: 12, offset: 0 });
    expect(fetchMock.mock.calls[0][0]).toContain('incluir_inactivas=true');
  });
});
