import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Text } from '../components/atoms';

const mocks = vi.hoisted(() => ({ capacidades: vi.fn() }));
vi.mock('../services/horariosRelacionesService', () => ({ obtenerCapacidadesBiometria: mocks.capacidades }));
vi.mock('../pages/ServicePortal/pages/Biometria/BiometriaDashboard', () => ({ default: () => <div>Mi asistencia cargada</div> }));
vi.mock('../pages/ServicePortal/pages/Biometria/BiometriaAdminView', () => ({ default: () => <div>Equipo cargado</div> }));

import BiometriaModule from '../pages/ServicePortal/pages/Biometria/BiometriaModule';

describe('BiometriaModule', () => {
  beforeEach(() => vi.clearAllMocks());
  const LocationProbe = () => <Text as="span" aria-label="ruta actual">{useLocation().pathname}</Text>;
  const renderModule = () => render(<MemoryRouter initialEntries={['/service-portal/biometria']}><BiometriaModule /><LocationProbe /></MemoryRouter>);

  it('distingue error de falta de permiso y permite reintentar capacidades', async () => {
    mocks.capacidades.mockRejectedValueOnce(new Error('ERP no disponible')).mockResolvedValueOnce({ puede_supervisar_equipo: true });
    renderModule();
    expect(await screen.findByRole('alert')).toHaveTextContent('ERP no disponible');
    expect(screen.getByText('Mi asistencia cargada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Equipo cargado')).toBeInTheDocument();
    expect(mocks.capacidades).toHaveBeenCalledTimes(2);
  });

  it('implementa tabs enlazadas y navegación con flechas', async () => {
    mocks.capacidades.mockResolvedValue({ puede_supervisar_equipo: true });
    renderModule();
    const equipo = await screen.findByRole('tab', { name: 'Asistencia del equipo' });
    const propia = screen.getByRole('tab', { name: 'Mi asistencia' });
    expect(equipo).toHaveAttribute('aria-controls', 'biometria-panel-admin');
    fireEvent.keyDown(equipo, { key: 'ArrowRight' });
    await waitFor(() => expect(propia).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'biometria-tab-asistencia');
  });

  it('vuelve al hub de Tiempo y Asistencia', async () => {
    mocks.capacidades.mockResolvedValue({ puede_supervisar_equipo: false });
    renderModule();
    fireEvent.click(await screen.findByRole('button', { name: 'Volver a Tiempo y Asistencia' }));
    expect(screen.getByLabelText('ruta actual')).toHaveTextContent('/service-portal/tiempo-asistencia');
  });
});
