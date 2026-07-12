import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Text } from '../components/atoms';

const mocks = vi.hoisted(() => ({
  aplicar: vi.fn(), actualizar: vi.fn(), crear: vi.fn(), desactivar: vi.fn(), duplicar: vi.fn(),
  listarEmpleados: vi.fn(), notificar: vi.fn(), recargar: vi.fn(),
}));

const plantilla = {
  id: 'p1', nombre: 'Horario base', descripcion: null, version: 2, esta_activa: true,
  dias: Array.from({ length: 7 }, (_, index) => ({
    dia_semana: index + 1, hora_entrada: index < 5 ? '08:00' : null,
    hora_salida: index < 5 ? '17:00' : null, minutos_almuerzo: index < 5 ? 60 : 0,
    cruza_medianoche: false,
  })),
};

vi.mock('../pages/ServicePortal/pages/HORAS_EXTRAS/PlantillasHorario/hooks/usePlantillasHorario', () => ({
  usePlantillasHorario: () => ({ items: [plantilla], total: 1, offset: 0, limit: 12, busqueda: '', soloActivas: true, cargando: false, error: null, setBusqueda: vi.fn(), setSoloActivas: vi.fn(), setOffset: vi.fn(), recargar: mocks.recargar }),
}));
vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({ state: { user: { permissions: ['nomina_horas_extras.planificar'] } } }),
}));
vi.mock('../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: mocks.notificar }),
}));
vi.mock('../services/horariosRelacionesService', () => ({
  aplicarPlantilla: mocks.aplicar,
  actualizarPlantilla: mocks.actualizar,
  crearPlantilla: mocks.crear,
  desactivarPlantilla: mocks.desactivar,
  duplicarPlantilla: mocks.duplicar,
  listarEmpleadosOperativos: mocks.listarEmpleados,
}));

import PlantillasHorarioPage from '../pages/ServicePortal/pages/HORAS_EXTRAS/PlantillasHorario';

const LocationProbe = () => <Text as="span" aria-label="ruta actual">{useLocation().pathname}</Text>;
const renderPage = () => render(<MemoryRouter initialEntries={['/service-portal/horas-extras/plantillas']}><PlantillasHorarioPage /><LocationProbe /></MemoryRouter>);

const empleadoResponse = {
  items: [{ cedula: '10', nombre: 'Ana', cargo: 'Operaria', area: 'A', ciudadcontratacion: 'Bogotá', jefe: 'Jefe', autoriza_he: true, disponible_semana: true, motivo_no_disponible: null }],
  total: 1, limit: 20, offset: 0, facetas: {},
};

describe('PlantillasHorarioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.crear.mockResolvedValue(plantilla);
    mocks.duplicar.mockResolvedValue(plantilla);
    mocks.desactivar.mockResolvedValue(plantilla);
    mocks.listarEmpleados.mockResolvedValue(empleadoResponse);
  });

  it('ejecuta crear, duplicar y desactivar mediante modales', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva plantilla' }));
    const editor = await screen.findByRole('dialog', { name: 'Nueva plantilla' });
    fireEvent.change(within(editor).getAllByRole('textbox')[0], { target: { value: 'Nueva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar plantilla' }));
    await waitFor(() => expect(mocks.crear).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: 'Duplicar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Crear copia' }));
    await waitFor(() => expect(mocks.duplicar).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Desactivar plantilla' })).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(mocks.desactivar).toHaveBeenCalledOnce());
  });

  it('reutiliza solicitud_id al reintentar una aplicación', async () => {
    mocks.aplicar.mockRejectedValueOnce(new Error('respuesta perdida')).mockResolvedValueOnce({ aplicacion_id: 'a1' });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Ana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a 1' }));
    await waitFor(() => expect(mocks.aplicar).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar a 1' }));
    await waitFor(() => expect(mocks.aplicar).toHaveBeenCalledTimes(2));
    expect(mocks.aplicar.mock.calls[1][1].solicitud_id).toBe(mocks.aplicar.mock.calls[0][1].solicitud_id);
  });

  it('evita doble submit de aplicación', async () => {
    let resolver!: (value: { aplicacion_id: string }) => void;
    mocks.aplicar.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Ana' }));
    const aplicar = screen.getByRole('button', { name: 'Aplicar a 1' });
    fireEvent.click(aplicar);
    fireEvent.click(aplicar);
    expect(mocks.aplicar).toHaveBeenCalledOnce();
    const cerrar = screen.getByRole('button', { name: 'Cerrar modal' });
    expect(cerrar).toBeDisabled();
    fireEvent.click(cerrar);
    expect(screen.getByRole('dialog', { name: 'Aplicar Horario base' })).toBeInTheDocument();
    resolver({ aplicacion_id: 'a1' });
    await waitFor(() => expect(mocks.recargar).toHaveBeenCalledOnce());
  });

  it('vuelve al hub de Tiempo y Asistencia', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Tiempo y Asistencia' }));
    expect(screen.getByLabelText('ruta actual')).toHaveTextContent('/service-portal/tiempo-asistencia');
  });
});
