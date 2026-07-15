import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listarEmpleados: vi.fn(),
  listarGestores: vi.fn(),
}));

vi.mock('../services/horariosRelacionesService', () => ({
  listarEmpleadosGestor: mocks.listarEmpleados,
  listarGestores: mocks.listarGestores,
}));

import { useAlcanceEmpleados } from '../pages/ServicePortal/pages/AlcanceEmpleados/hooks/useAlcanceEmpleados';

describe('useAlcanceEmpleados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listarGestores.mockResolvedValue({ items: [] });
    mocks.listarEmpleados.mockResolvedValue({ items: [], total: 0, facetas: {} });
  });

  it('envía filtros multivalor al backend y reinicia la paginación', async () => {
    const { result } = renderHook(() => useAlcanceEmpleados());

    act(() => result.current.setGestorId('gestor-1'));
    await waitFor(() => expect(mocks.listarEmpleados).toHaveBeenCalled());

    act(() => result.current.setOffset(25));
    await waitFor(() => expect(mocks.listarEmpleados).toHaveBeenLastCalledWith(
      'gestor-1',
      expect.objectContaining({ offset: 25 }),
      expect.any(AbortSignal),
    ));

    act(() => result.current.setAreas(['Norte', 'Sur']));
    await waitFor(() => expect(mocks.listarEmpleados).toHaveBeenLastCalledWith(
      'gestor-1',
      expect.objectContaining({ areas: ['Norte', 'Sur'], offset: 0 }),
      expect.any(AbortSignal),
    ));
  });

  it('descarta resultados anteriores cuando falla una consulta filtrada', async () => {
    mocks.listarEmpleados.mockResolvedValueOnce({
      items: [{ cedula: '1', nombre: 'Empleado' }],
      total: 1,
      facetas: { areas: ['Norte'] },
    });
    const { result } = renderHook(() => useAlcanceEmpleados());

    act(() => result.current.setGestorId('gestor-1'));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    mocks.listarEmpleados.mockRejectedValueOnce(new Error('Servicio no disponible'));
    act(() => result.current.setAreas(['Norte']));

    await waitFor(() => expect(result.current.error).toBe('Servicio no disponible'));
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.facetas).toEqual({});
  });
});
