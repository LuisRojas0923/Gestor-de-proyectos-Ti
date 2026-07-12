import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  actualizar: vi.fn(),
  notificar: vi.fn(),
  obtener: vi.fn(),
}));

vi.mock('../services/horasExtrasService', () => ({
  actualizarParametrosCalculo: mocks.actualizar,
  obtenerParametrosCalculo: mocks.obtener,
}));
vi.mock('../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: mocks.notificar }),
}));

import ConfiguracionHorasExtrasView from '../pages/ServicePortal/pages/HORAS_EXTRAS/ConfiguracionHorasExtrasView';

const parametros = [
  {
    codigo: 'HORAS_ORDINARIAS_SEMANALES_VIGENTE',
    nombre: 'Horas semanales vigentes',
    valor: '42',
    tipo_dato: 'NUMERICO' as const,
    norma_soporte: 'Ley 2101/2021',
    grupo: 'Jornada semanal',
    editable: true,
    vigente_desde: '2026-07-16',
    vigente_hasta: null,
    observaciones: null,
  },
  {
    codigo: 'MAX_HE_DIARIAS',
    nombre: 'Máximo de horas extras diarias',
    valor: '2',
    tipo_dato: 'NUMERICO' as const,
    norma_soporte: 'CST Art. 161',
    grupo: 'Topes',
    editable: true,
    vigente_desde: '2026-01-01',
    vigente_hasta: null,
    observaciones: null,
  },
];

describe('ConfiguracionHorasExtrasView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obtener.mockResolvedValue({ parametros });
    mocks.actualizar.mockImplementation(async ({ parametros: cambios }) => ({
      parametros: parametros.map((parametro) => {
        const cambio = cambios.find((item: { codigo: string }) => item.codigo === parametro.codigo);
        return cambio ? { ...parametro, valor: cambio.valor, observaciones: cambio.observaciones } : parametro;
      }),
    }));
  });

  it('destaca cambios pendientes y guarda únicamente la regla modificada', async () => {
    render(
      <MemoryRouter>
        <ConfiguracionHorasExtrasView />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Reglas sincronizadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Valor vigente de Horas semanales vigentes'), {
      target: { value: '41' },
    });

    const justificacion = screen.getByLabelText('Justificación del cambio para Horas semanales vigentes');
    expect(screen.getByText('Agrega una justificación nueva para este valor.')).toBeInTheDocument();
    expect(justificacion).toHaveAttribute('aria-invalid', 'true');
    expect(justificacion).toHaveAttribute('maxlength', '500');
    expect(screen.getAllByRole('button', { name: 'Guardar cambios' }).every((button) => button.hasAttribute('disabled'))).toBe(true);

    fireEvent.change(justificacion, {
      target: { value: 'Ajuste aprobado por Gestión Humana' },
    });

    expect(screen.getByText('1 cambio pendiente')).toBeInTheDocument();
    expect(screen.getByText('Cambio pendiente')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar cambios' })[0]);

    await waitFor(() => {
      expect(mocks.actualizar).toHaveBeenCalledWith(
        {
          parametros: [{
            codigo: 'HORAS_ORDINARIAS_SEMANALES_VIGENTE',
            valor: '41',
            observaciones: 'Ajuste aprobado por Gestión Humana',
          }],
        },
        '',
      );
    });
    expect(mocks.notificar).toHaveBeenCalledWith('success', 'Reglas de horas extras actualizadas');
  });

  it('protege los cambios pendientes antes de recargar', async () => {
    render(
      <MemoryRouter>
        <ConfiguracionHorasExtrasView />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Valor vigente de Horas semanales vigentes'), {
      target: { value: '41' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }));

    expect(screen.getByRole('dialog', { name: '¿Descartar cambios pendientes?' })).toBeInTheDocument();
    expect(mocks.obtener).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mantiene visible el error de carga y permite reintentar', async () => {
    mocks.obtener.mockRejectedValueOnce(new Error('Servicio no disponible'));
    render(
      <MemoryRouter>
        <ConfiguracionHorasExtrasView />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible');
    expect(screen.getByText('No se pudieron cargar las reglas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Horas semanales vigentes')).toBeInTheDocument();
  });
});
