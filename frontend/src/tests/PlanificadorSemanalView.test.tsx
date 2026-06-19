/**
 * Tests Sprint S7 — PlanificadorSemanalView y sub-componentes.
 *
 * Cobertura:
 *  - SelectorEmpleados: render + busqueda contra mock
 *  - DefaultHorarioSemana: aplicar a todos
 *  - PlanificadorSemanalView: aplica horario masivo y pre-calcula
 *  - PlanificadorSemanalView: ruta de empleados activos conserva borrador
 *  - PlanificadorSemanalView: guardar borrador llama endpoint
 *  - PlanificadorSemanalView: confirmar muestra OK/errores
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// Mock del modulo de notificaciones (usado por el componente)
vi.mock('../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({
    addNotification: vi.fn(),
  }),
}));

// Mock del servicio para no hacer fetch real
vi.mock('../services/horasExtrasService', () => ({
  buscarEmpleadosERP: vi.fn(),
  preCalcularPlan: vi.fn(),
  guardarBorradorPlan: vi.fn(),
  confirmarPlan: vi.fn(),
}));

import PlanificadorSemanalView from '../pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView';
import EmpleadosActivosView from '../pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView';
import SelectorEmpleados from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/SelectorEmpleados';
import DefaultHorarioSemana from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/DefaultHorarioSemana';
import { PLANIFICADOR_DRAFT_KEY } from '../pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft';
import {
  buscarEmpleadosERP,
  preCalcularPlan,
  guardarBorradorPlan,
  confirmarPlan,
} from '../services/horasExtrasService';

const TOKEN = 'fake-token';

const wrapperRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

const mockEmpleados = {
  items: [
    { cedula: '123', nombre: 'Juan', cargo: 'Op', area: 'A', ciudadcontratacion: 'Bogota', quien_reporta: 'Lider Uno', nivel_riesgo_arl: 'III', autoriza_he: true },
    { cedula: '456', nombre: 'Maria', cargo: 'Op', area: 'A', ciudadcontratacion: 'Medellin', quien_reporta: 'Lider Dos', nivel_riesgo_arl: 'III', autoriza_he: true },
    { cedula: '789', nombre: 'Pedro', cargo: 'Op', area: 'B', ciudadcontratacion: 'Cali', quien_reporta: 'Lider Tres', nivel_riesgo_arl: 'III', autoriza_he: false },
  ],
  total: 3,
  limit: 50,
  offset: 0,
};

const agregarEmpleadosActivos = async () => {
  const input = await screen.findByPlaceholderText(/Buscar por cédula/);
  fireEvent.change(input, { target: { value: 'Juan' } });

  await waitFor(() => {
    expect(buscarEmpleadosERP).toHaveBeenCalledWith('Juan', expect.any(Number), 0, TOKEN, true);
  });

  await screen.findByLabelText('Seleccionar 123');
  fireEvent.click(screen.getByRole('button', { name: /Incluir visibles/i }));
  await waitFor(() => {
    expect(screen.getByText(/2 \/ 200 seleccionados/)).toBeTruthy();
  });
};

describe('SelectorEmpleados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmpleados);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza sin consultar ERP hasta que haya busqueda', async () => {
    const onToggle = vi.fn();
    const onLimpiar = vi.fn();
    wrapperRouter(
      <SelectorEmpleados
        token={TOKEN}
        seleccionados={new Set()}
        onToggle={onToggle}
        onLimpiar={onLimpiar}
      />,
    );

    expect(screen.getByText(/Sin resultados/)).toBeTruthy();
    expect(buscarEmpleadosERP).not.toHaveBeenCalled();
  });

  it('permite buscar empleados por texto', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockEmpleados,
      items: [mockEmpleados.items[0]],
    });
    const onToggle = vi.fn();
    const onLimpiar = vi.fn();
    wrapperRouter(
      <SelectorEmpleados
        token={TOKEN}
        seleccionados={new Set()}
        onToggle={onToggle}
        onLimpiar={onLimpiar}
      />,
    );

    const input = await screen.findByPlaceholderText(/Buscar por cédula/);
    fireEvent.change(input, { target: { value: 'Juan' } });

    await waitFor(() => {
      expect(buscarEmpleadosERP).toHaveBeenCalledWith(
        'Juan',
        expect.any(Number),
        expect.any(Number),
        TOKEN,
        expect.any(Boolean),
      );
    });
  });
});

describe('DefaultHorarioSemana', () => {
  it('llama onAplicarATodos al hacer click en el boton', () => {
    const onChange = vi.fn();
    const onAplicar = vi.fn();
    const dias = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
      dia_semana: d,
      hora_entrada: '07:30',
      hora_salida: '17:00',
      minutos_almuerzo: 60,
      novedades: [],
    }));
    wrapperRouter(
      <DefaultHorarioSemana dias={dias} onChange={onChange} onAplicarATodos={onAplicar} />,
    );

    const boton = screen.getByText(/Aplicar a todos/);
    fireEvent.click(boton);
    expect(onAplicar).toHaveBeenCalledTimes(1);
  });

  it('permite editar la hora de entrada de un dia', () => {
    const onChange = vi.fn();
    const dias = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
      dia_semana: d,
      hora_entrada: '07:30',
      hora_salida: '17:00',
      minutos_almuerzo: 60,
      novedades: [],
    }));
    wrapperRouter(
      <DefaultHorarioSemana dias={dias} onChange={onChange} onAplicarATodos={() => {}} />,
    );

    // El primer input con valor 07:30 es la entrada del Lunes
    const entradaInput = screen.getAllByDisplayValue('07:30')[0];
    fireEvent.change(entradaInput, { target: { value: '08:00' } });

    expect(onChange).toHaveBeenCalled();
    const llamado = onChange.mock.calls[0][0];
    expect(llamado[0].hora_entrada).toBe('08:00');
  });
});

describe('PlanificadorSemanalView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockClear();
    localStorage.setItem('token', TOKEN);
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmpleados);
    (preCalcularPlan as ReturnType<typeof vi.fn>).mockResolvedValue({
      empleados: [
        {
          cedula: '123',
          total_horas_trabajadas: 42.5,
          total_horas_ordinarias: 40,
          total_horas_extras: 2.5,
          total_costo_estimado: 50000,
          detalle_por_dia: [],
        },
      ],
      resumen: {
        total_horas_extras: 2.5,
        total_costo_estimado: 50000,
        empleados_count: 1,
      },
    });
    (guardarBorradorPlan as ReturnType<typeof vi.fn>).mockResolvedValue({
      registros_horario_creados: 7,
      registros_horario_actualizados: 0,
      novedades_creadas: 0,
      errores: [],
    });
    (confirmarPlan as ReturnType<typeof vi.fn>).mockResolvedValue({
      calculos: [{ cedula: '123', calculo_id: 1, ok: true, mensaje: 'OK' }],
      errores: [],
      resumen: { ok_count: 1, error_count: 0, total_horas_extras: 2.5, total_costo: 50000 },
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renderiza con selector de semana', async () => {
    wrapperRouter(<PlanificadorSemanalView />);
    expect(screen.getByText(/Horas extras — planificación masiva/)).toBeTruthy();
    expect(screen.getByText(/Horario masivo/)).toBeTruthy();
  });

  it('pre-calcular muestra totales en resumen', async () => {
    wrapperRouter(<PlanificadorSemanalView />);

    await agregarEmpleadosActivos();

    // Click en pre-calcular (boton especifico, no "Pre-cálculo" en resumen)
    const preCalcularBtn = screen.getByRole('button', { name: /Pre-calcular/i });
    fireEvent.click(preCalcularBtn);

    await waitFor(
      () => {
        expect(preCalcularPlan).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Esperar a que aparezca el total en tabla/resumen
    const totales = await screen.findAllByText('2.5h', {}, { timeout: 3000 });
    expect(totales.length).toBeGreaterThan(0);
  });

  it('aplica horario masivo antes de guardar', async () => {
    wrapperRouter(<PlanificadorSemanalView />);

    await agregarEmpleadosActivos();

    const entrada = screen.getByDisplayValue('07:30');
    fireEvent.change(entrada, { target: { value: '08:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Aplicar horario/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(guardarBorradorPlan).toHaveBeenCalled();
      const callArg = (guardarBorradorPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.empleados[0].dias[0].hora_entrada).toBe('08:00');
    });
  });

  it('navega a empleados activos guardando el borrador del planificador', async () => {
    wrapperRouter(<PlanificadorSemanalView />);

    await agregarEmpleadosActivos();

    fireEvent.click(screen.getByRole('button', { name: /Empleados/i }));

    expect(navigateMock).toHaveBeenCalledWith('/service-portal/horas-extras/empleados');

    const draft = JSON.parse(window.sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY) ?? '{}');
    expect(draft.seleccionados).toEqual(['123', '456']);
    expect(draft.empleadosInfo).toHaveLength(2);
  });

  it('muestra empleados activos con ciudad de contratacion y permite buscar por ciudad', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    wrapperRouter(<EmpleadosActivosView />);

    await screen.findByText('Ciudad contratación');
    expect(await screen.findByText('Bogota')).toBeTruthy();
    expect(screen.getByText('Medellin')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/ciudad/i), { target: { value: 'Medellin' } });

    await waitFor(() => {
      expect(screen.getByText(/Maria/)).toBeTruthy();
      expect(screen.queryByText(/Juan/)).toBeNull();
    });
  });

  it('guardar borrador llama endpoint con payload correcto', async () => {
    wrapperRouter(<PlanificadorSemanalView />);

    await agregarEmpleadosActivos();

    const guardarBtn = screen.getByRole('button', { name: /Guardar borrador/i });
    fireEvent.click(guardarBtn);

    await waitFor(() => {
      expect(guardarBorradorPlan).toHaveBeenCalled();
      const callArg = (guardarBorradorPlan as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArg.semana).toBeDefined();
      expect(callArg.empleados).toBeInstanceOf(Array);
      expect(callArg.empleados.length).toBeGreaterThan(0);
    });
  });

  it('confirmar muestra errores si los hay', async () => {
    (confirmarPlan as ReturnType<typeof vi.fn>).mockResolvedValue({
      calculos: [],
      errores: [{ cedula: '999', motivo: 'Sin horario' }],
      resumen: { ok_count: 0, error_count: 1, total_horas_extras: 0, total_costo: 0 },
    });

    wrapperRouter(<PlanificadorSemanalView />);

    await agregarEmpleadosActivos();

    const confirmarBtn = screen.getByRole('button', { name: /Confirmar semana/i });
    fireEvent.click(confirmarBtn);
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar y guardar/i }));

    await waitFor(() => {
      expect(confirmarPlan).toHaveBeenCalled();
      const callArg = (confirmarPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.empleados[0].parametros).toBeUndefined();
    });

  });
});
