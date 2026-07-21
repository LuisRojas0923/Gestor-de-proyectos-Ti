import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/horasExtrasPlanillaService', () => ({
  listarCalculosPlanilla: vi.fn(),
}));

import CalculoListView from '../pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView';
import { listarCalculosPlanilla } from '../services/horasExtrasPlanillaService';
import type { CalculoPlanilla } from '../types/horasExtrasPlanilla';
import { Text } from '../components/atoms';

const fila: CalculoPlanilla = {
  fila_id: '772:salario:2026-06-06:0',
  calculo_id: 772,
  cedula: '80167661',
  empleado: 'MOLANO ANTURY MIGUEL ANGEL',
  salario: 3_000_000,
  base_hora: 14_286,
  aplica_he: true,
  empresa: 'SUMMAR TEMPORALES',
  sucursal: 'BOGOTA',
  fecha: '2026-06-06',
  ot_cc: '3080',
  sub_subc: '20',
  especialidad_ot: null,
  cantidad: 1,
  ubicacion: 'CC',
  novedad: 'SALARIO',
  cantidad_horas: 8,
  observaciones: null,
  responsable: 'CAMILA BAHOZ',
  encargados: 'ADN',
  cliente: 'ADN',
  costo_total: 0,
  estado: 'CONFIRMADO',
};

const renderView = () => render(
  <MemoryRouter initialEntries={['/service-portal/horas-extras/calculos']}>
    <Routes>
      <Route path="/service-portal/horas-extras/calculos" element={<CalculoListView />} />
      <Route path="/service-portal/horas-extras/calculos/:calculoId" element={<Text>Detalle del cálculo</Text>} />
    </Routes>
  </MemoryRouter>,
);

describe('CalculoListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'token-prueba');
    vi.mocked(listarCalculosPlanilla).mockResolvedValue([fila]);
  });

  it('presenta las 19 columnas y los datos diarios del empleado', async () => {
    renderView();

    expect(await screen.findByText('CÁLCULOS DE HORAS EXTRAS')).toBeInTheDocument();
    expect(screen.getByText('Registros filtrados')).toBeInTheDocument();
    expect(screen.getByText('Empleados filtrados')).toBeInTheDocument();
    expect(screen.getByText('Horas registradas')).toBeInTheDocument();
    expect(screen.getByText('Costo calculado')).toBeInTheDocument();
    const encabezados = [
      'CÉDULA', 'EMPLEADO', 'SALARIO', 'BASE HORA', 'APLICA HE', 'EMPRESA',
      'SUCURSAL', 'FECHA', 'OT / CC', 'SUB. / SUBC.', 'ESPECIALIDAD OT',
      'CANTIDAD', 'UBICACIÓN', 'NOVEDAD', 'CANT. HORAS', 'OBSERVACIONES',
      'RESPONSABLE', 'ENCARGADOS', 'CLIENTE',
    ];
    expect(screen.getAllByRole('columnheader').map((encabezado) => encabezado.textContent)).toEqual(encabezados);
    expect(screen.getByText('80167661')).toBeInTheDocument();
    expect(screen.getByText('MOLANO ANTURY MIGUEL ANGEL')).toBeInTheDocument();
    expect(screen.getByText('SUMMAR TEMPORALES')).toBeInTheDocument();
    expect(screen.getByText('6/06/2026')).toBeInTheDocument();
    expect(screen.getByText('CAMILA BAHOZ')).toBeInTheDocument();
    expect(screen.queryByText(/Archivo \.xlsm/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Procesar/i })).not.toBeInTheDocument();
  });

  it('combina filtros independientes de empleado y empresa', async () => {
    vi.mocked(listarCalculosPlanilla).mockResolvedValue([
      fila,
      { ...fila, fila_id: '773:salario', calculo_id: 773, cedula: '1093775340', empleado: 'PARRA RINCON GERSON GEOVANNY', empresa: 'REFRIDCOL' },
      { ...fila, fila_id: '774:salario', calculo_id: 774, cedula: '1127345887', empleado: 'MOLANO ANTURY MIGUEL ANGEL', empresa: 'REFRIDCOL' },
    ]);
    renderView();
    await screen.findByText('80167661');

    fireEvent.click(screen.getByRole('button', { name: 'EMPLEADO' }));
    fireEvent.click(screen.getByRole('button', { name: 'MOLANO ANTURY MIGUEL ANGEL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(screen.getByText('80167661')).toBeInTheDocument();
    expect(screen.getByText('1127345887')).toBeInTheDocument();
    expect(screen.queryByText('1093775340')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'EMPRESA' }));
    fireEvent.click(screen.getByRole('button', { name: 'SUMMAR TEMPORALES' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(screen.getByText('80167661')).toBeInTheDocument();
    expect(screen.queryByText('1127345887')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar 2 filtros' })).toBeInTheDocument();
  });

  it('normaliza y permite filtrar empleados no disponibles', async () => {
    vi.mocked(listarCalculosPlanilla).mockResolvedValue([
      { ...fila, empleado: null },
      { ...fila, fila_id: '773:salario', calculo_id: 773, cedula: '1093775340', empleado: 'PARRA RINCON GERSON GEOVANNY' },
    ]);
    renderView();
    await screen.findAllByText('No disponible');

    fireEvent.click(screen.getByRole('button', { name: 'EMPLEADO' }));
    fireEvent.click(screen.getByRole('button', { name: 'No disponible' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(screen.getByText('80167661')).toBeInTheDocument();
    expect(screen.queryByText('1093775340')).not.toBeInTheDocument();
  });

  it('preserva el orden reciente entregado por el servicio', async () => {
    vi.mocked(listarCalculosPlanilla).mockResolvedValue([
      { ...fila, fila_id: '773:salario', calculo_id: 773, cedula: '1093775340' },
      fila,
    ]);
    renderView();
    await screen.findByText('1093775340');

    expect(screen.getAllByText(/^(1093775340|80167661)$/).map((item) => item.textContent)).toEqual(['1093775340', '80167661']);
  });

  it('renderiza cien filas inicialmente y permite cargar el siguiente bloque', async () => {
    const filas = Array.from({ length: 150 }, (_, indice) => ({
      ...fila,
      fila_id: `${indice}:salario`,
      calculo_id: indice + 1,
      cedula: String(10_000_000 + indice),
    }));
    vi.mocked(listarCalculosPlanilla).mockResolvedValue(filas);

    renderView();

    expect(await screen.findByText('10000000')).toBeInTheDocument();
    expect(screen.queryByText('10000149')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 100 de 150 registros')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más registros' }));

    expect(await screen.findByText('10000149')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cargar más registros' })).not.toBeInTheDocument();
  });

  it('reinicia el bloque visible al limpiar todos los filtros', async () => {
    const filas = Array.from({ length: 150 }, (_, indice) => ({
      ...fila,
      fila_id: `${indice}:salario`,
      calculo_id: indice + 1,
      cedula: String(10_000_000 + indice),
      empresa: indice < 120 ? 'REFRIDCOL' : 'SUMMAR TEMPORALES',
    }));
    vi.mocked(listarCalculosPlanilla).mockResolvedValue(filas);
    renderView();
    await screen.findByText('10000000');

    fireEvent.click(screen.getByRole('button', { name: 'EMPRESA' }));
    fireEvent.click(screen.getByRole('button', { name: 'REFRIDCOL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más registros' }));
    expect(await screen.findByText('10000119')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar 1 filtros' }));

    expect(screen.queryByText('10000149')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 100 de 150 registros')).toBeInTheDocument();
  });

  it('diferencia estados de carga y consulta vacía', async () => {
    let resolver: (filas: CalculoPlanilla[]) => void = () => undefined;
    vi.mocked(listarCalculosPlanilla).mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    renderView();

    expect(await screen.findByText('Consultando cálculos...')).toBeInTheDocument();
    resolver([]);

    expect(await screen.findByText('No hay cálculos para los filtros seleccionados.')).toBeInTheDocument();
  });

  it('anuncia el error sin mostrarlo como una consulta vacía exitosa', async () => {
    vi.mocked(listarCalculosPlanilla).mockRejectedValue(new Error('fallo'));
    renderView();

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible consultar los cálculos');
    expect(screen.queryByText('No hay cálculos para los filtros seleccionados.')).not.toBeInTheDocument();
  });

  it('conserva filtros y navegación al detalle', async () => {
    renderView();
    await screen.findByText('80167661');

    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(listarCalculosPlanilla).toHaveBeenLastCalledWith(
      expect.objectContaining({ cedula: '123', limit: 100 }),
      'token-prueba',
    ));

    fireEvent.click(screen.getByText('80167661'));
    expect(await screen.findByText('Detalle del cálculo')).toBeInTheDocument();
  });
});
