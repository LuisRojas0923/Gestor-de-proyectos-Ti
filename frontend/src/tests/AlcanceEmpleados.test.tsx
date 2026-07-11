import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  guardar: vi.fn(),
  notificar: vi.fn(),
  recargar: vi.fn(),
  recargarGestores: vi.fn(),
  setGestorId: vi.fn(),
}));

const empleado = (index: number) => ({
  cedula: String(index), nombre: `Empleado ${index}`, cargo: 'Cargo', area: 'Área',
  ciudadcontratacion: 'Bogotá', jefe: 'Jefe', autoriza_he: true,
  disponible_semana: true, motivo_no_disponible: null, relacionado: false,
});

let items = [empleado(1)];
const hookResult = () => ({
  gestores: [
    { id: 'g1', nombre: 'Gestor Uno', rol: 'manager', relaciones_activas: 0 },
    { id: 'g2', nombre: 'Gestor Dos', rol: 'manager', relaciones_activas: 0 },
  ],
  gestorId: 'g1', busquedaGestor: '', items, total: items.length, facetas: {}, q: '',
  anio: 2026, semanaIso: 28, relacionado: undefined, autorizaHe: undefined,
  disponible: undefined, cargo: '', area: '', ciudad: '', jefe: '', offset: 0,
  limit: 25, cargando: false, error: null, cargandoGestores: false, errorGestores: null,
  setBusquedagestor: vi.fn(), setGestorId: mocks.setGestorId, setQ: vi.fn(), setAnio: vi.fn(),
  setSemanaIso: vi.fn(), setRelacionado: vi.fn(), setAutorizaHe: vi.fn(), setDisponible: vi.fn(),
  setCargo: vi.fn(), setArea: vi.fn(), setCiudad: vi.fn(), setJefe: vi.fn(), setOffset: vi.fn(),
  recargar: mocks.recargar, recargarGestores: mocks.recargarGestores,
});

vi.mock('../pages/ServicePortal/pages/AlcanceEmpleados/hooks/useAlcanceEmpleados', () => ({
  useAlcanceEmpleados: () => hookResult(),
}));
vi.mock('../services/horariosRelacionesService', () => ({ guardarRelaciones: mocks.guardar }));
vi.mock('../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: mocks.notificar }),
}));

import AlcanceEmpleadosPage from '../pages/ServicePortal/pages/AlcanceEmpleados';

const resultado = { gestor_id: 'g1', agregadas: 1, reactivadas: 0, desactivadas: 0, sin_cambio: 0, idempotente: false };

describe('AlcanceEmpleadosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    items = [empleado(1)];
  });

  it('conserva solicitud_id al reintentar y refresca empleados y gestores al tener éxito', async () => {
    mocks.guardar.mockRejectedValueOnce(new Error('respuesta perdida')).mockResolvedValueOnce(resultado);
    render(<AlcanceEmpleadosPage />);
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Relacionar Empleado 1' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.guardar).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.guardar).toHaveBeenCalledTimes(2));

    expect(mocks.guardar.mock.calls[1][1].solicitud_id).toBe(mocks.guardar.mock.calls[0][1].solicitud_id);
    expect(mocks.recargar).toHaveBeenCalledOnce();
    expect(mocks.recargarGestores).toHaveBeenCalledOnce();
  });

  it('evita doble submit incluso antes del rerender', async () => {
    let resolver!: (value: typeof resultado) => void;
    mocks.guardar.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    render(<AlcanceEmpleadosPage />);
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Relacionar Empleado 1' })[0]);
    const guardar = screen.getByRole('button', { name: 'Guardar cambios' });
    fireEvent.click(guardar);
    fireEvent.click(guardar);
    expect(mocks.guardar).toHaveBeenCalledOnce();
    resolver(resultado);
    await waitFor(() => expect(mocks.recargar).toHaveBeenCalledOnce());
  });

  it('confirma de forma accesible el descarte al cambiar de gestor', async () => {
    render(<AlcanceEmpleadosPage />);
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Relacionar Empleado 1' })[0]);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'g2' } });
    expect(await screen.findByRole('dialog', { name: 'Descartar cambios pendientes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar y cambiar' }));
    expect(mocks.setGestorId).toHaveBeenCalledWith('g2');
  });

  it('limita la selección masiva y el payload a 200 cambios', async () => {
    items = Array.from({ length: 201 }, (_, index) => empleado(index + 1));
    mocks.guardar.mockResolvedValue(resultado);
    render(<AlcanceEmpleadosPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar página' }));
    expect(screen.getByRole('status')).toHaveTextContent('Máximo alcanzado: 200');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.guardar).toHaveBeenCalledOnce());
    expect(mocks.guardar.mock.calls[0][1].cedulas_agregar).toHaveLength(200);
  });
});
