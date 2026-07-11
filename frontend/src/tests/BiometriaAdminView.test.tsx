import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), eliminar: vi.fn(), asistencias: vi.fn(), evidencia: vi.fn(), notificar: vi.fn(),
  admin: true,
}));
vi.mock('axios', () => ({ default: { get: mocks.get, post: mocks.post, delete: mocks.eliminar } }));
vi.mock('../hooks/useIsAdmin', () => ({ useIsAdmin: () => mocks.admin }));
vi.mock('../components/notifications/NotificationsContext', () => ({ useNotifications: () => ({ addNotification: mocks.notificar }) }));
vi.mock('../services/horariosRelacionesService', () => ({
  listarAsistenciasBiometria: mocks.asistencias,
  obtenerEvidenciaBiometria: mocks.evidencia,
}));

import BiometriaAdminView from '../pages/ServicePortal/pages/Biometria/BiometriaAdminView';

describe('BiometriaAdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.admin = true;
    mocks.asistencias.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    mocks.get.mockResolvedValue({ data: [{ id: 7, nombre: 'Sede Norte', latitud: 4.6, longitud: -74, radio: 100 }] });
    mocks.eliminar.mockResolvedValue({});
  });

  it('enlaza tab y panel, navega con flechas y confirma antes de eliminar', async () => {
    render(<BiometriaAdminView />);
    const asistencias = screen.getByRole('tab', { name: 'Asistencias' });
    expect(asistencias).toHaveAttribute('aria-controls', 'supervision-panel-asistencias');
    fireEvent.keyDown(asistencias, { key: 'ArrowRight' });
    const zonas = await screen.findByRole('tab', { name: 'Zonas' });
    await waitFor(() => expect(zonas).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'supervision-tab-zonas');

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(mocks.eliminar).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar zona' });
    expect(dialog).toHaveTextContent('Sede Norte');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar zona' }));
    await waitFor(() => expect(mocks.eliminar).toHaveBeenCalledOnce());
    expect(mocks.eliminar.mock.calls[0][0]).toContain('/zonas/7');
  });

  it('muestra feedback accesible cuando no existe geolocalización', async () => {
    const original = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    try {
      render(<BiometriaAdminView />);
      fireEvent.click(screen.getByRole('tab', { name: 'Zonas' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Usar mi ubicación' }));
      expect(screen.getByRole('alert')).toHaveTextContent('no soporta geolocalización');
    } finally {
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: original });
    }
  });

  it('da nombre propio al panel cuando el usuario no tiene tabs administrativas', async () => {
    mocks.admin = false;
    render(<BiometriaAdminView />);
    const panel = await screen.findByRole('tabpanel', { name: 'Asistencias del equipo' });
    expect(panel).not.toHaveAttribute('aria-labelledby');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
