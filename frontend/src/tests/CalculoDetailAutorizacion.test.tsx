import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  permisos: [] as string[],
  autorizarCalculo: vi.fn(),
  obtenerCalculo: vi.fn(),
  obtenerEstadoGlobalBolsa: vi.fn(),
  obtenerHistorial: vi.fn(),
  transicionarCalculo: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ calculoId: '17' }),
}));

vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    state: { user: { permissions: mocks.permisos } },
  }),
}));

vi.mock('../services/horasExtrasService', () => ({
  autorizarCalculo: mocks.autorizarCalculo,
  obtenerCalculo: mocks.obtenerCalculo,
  obtenerEstadoGlobalBolsa: mocks.obtenerEstadoGlobalBolsa,
  obtenerHistorial: mocks.obtenerHistorial,
  transicionarCalculo: mocks.transicionarCalculo,
}));

import CalculoDetailView from '../pages/ServicePortal/pages/HORAS_EXTRAS/CalculoDetailView';

const calculoPendiente = {
  id: 17,
  cedula: '789',
  anio: 2026,
  semana_iso: 29,
  fecha_inicio: '2026-07-13',
  fecha_fin: '2026-07-19',
  nivel_riesgo_arl: 'III',
  factor_prestacional: 0.52436,
  salario_base_mensual: 3_000_000,
  valor_hora_ordinaria: 12_500,
  total_horas_extras: 2,
  total_horas_recargo_nocturno: 0,
  total_valor_bruto: 31_250,
  total_carga_prestacional: 16_386,
  total_costo_empresa: 47_636,
  estado: 'PENDIENTE_AUTORIZACION',
  calculado_por: 'gestor',
  calculado_en: '2026-07-17T10:00:00',
  confirmado_por: null,
  confirmado_en: null,
  observaciones: null,
  detalles: [],
  detalle_diario_estado: 'HISTORICO_SIN_SNAPSHOT',
  detalle_diario: [],
};

describe('CalculoDetailView autorización', () => {
  beforeEach(() => {
    mocks.permisos = [];
    mocks.autorizarCalculo.mockReset();
    mocks.obtenerCalculo.mockReset().mockResolvedValue(calculoPendiente);
    mocks.obtenerEstadoGlobalBolsa.mockReset().mockResolvedValue({ bolsa_habilitada: true });
    mocks.obtenerHistorial.mockReset().mockResolvedValue([]);
  });

  it('oculta Autorizar sin el permiso exacto', async () => {
    render(<CalculoDetailView />);

    await screen.findAllByText('PENDIENTE_AUTORIZACION');
    expect(screen.queryByRole('button', { name: 'Autorizar' })).toBeNull();
  });

  it('autoriza con permiso RBAC y evita doble clic durante la solicitud', async () => {
    mocks.permisos = ['nomina_horas_extras.autorizar'];
    const respuestaAutorizacion = {
      calculo_id: 17,
      estado_anterior: 'PENDIENTE_AUTORIZACION',
      estado_nuevo: 'CONFIRMADO',
      evento_id: 5,
      movimiento_bolsa_id: 8,
      horas_afectadas: 2,
      ya_autorizado: false,
      mensaje: 'Cálculo autorizado correctamente',
    };
    let resolverSolicitud: ((value: typeof respuestaAutorizacion) => void) | undefined;
    mocks.autorizarCalculo.mockImplementation(() => new Promise((resolve) => {
      resolverSolicitud = resolve;
    }));
    render(<CalculoDetailView />);

    const boton = await screen.findByRole('button', { name: 'Autorizar' });
    fireEvent.click(boton);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Autorizando...' })).toBeDisabled();
      expect(mocks.autorizarCalculo).toHaveBeenCalledWith(17, '');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Autorizando...' }));
    expect(mocks.autorizarCalculo).toHaveBeenCalledTimes(1);
    resolverSolicitud?.(respuestaAutorizacion);
    await waitFor(() => expect(mocks.obtenerCalculo).toHaveBeenCalledTimes(2));
  });
});
