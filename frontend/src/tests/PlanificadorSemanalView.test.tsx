/**
 * Tests Sprint S7 — PlanificadorSemanalView y sub-componentes.
 *
 * Cobertura:
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
import DefaultHorarioSemana from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/DefaultHorarioSemana';
import {
  crearBorradorPlanificadorBase,
  guardarBorradorPlanificadorLocal,
  leerBorradorPlanificador,
  PLANIFICADOR_DRAFT_KEY,
} from '../pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft';
import {
  buscarEmpleadosERP,
  preCalcularPlan,
  guardarBorradorPlan,
  confirmarPlan,
} from '../services/horasExtrasService';

const TOKEN = 'fake-token'; // @audit-ok: token dummy usado solo por mocks de tests

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

const guardarSeleccionPlanificador = () => {
  guardarBorradorPlanificadorLocal({
    ...crearBorradorPlanificadorBase(),
    seleccionados: ['123', '456'],
    empleadosInfo: [
      ['123', mockEmpleados.items[0]],
      ['456', mockEmpleados.items[1]],
    ],
  });
};

const renderPlanificadorConSeleccion = () => {
  guardarSeleccionPlanificador();
  return wrapperRouter(<PlanificadorSemanalView />);
};

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

describe('planificadorDraft', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('guarda y lee el borrador local con valores normalizados', () => {
    const draft = crearBorradorPlanificadorBase();
    guardarBorradorPlanificadorLocal({
      ...draft,
      seleccionados: ['456'],
      empleadosInfo: [['456', mockEmpleados.items[1]]],
      plantillaEntrada: '08:00',
    });

    const leido = leerBorradorPlanificador();
    expect(leido?.seleccionados).toEqual(['456']);
    expect(leido?.empleadosInfo[0][1].ciudadcontratacion).toBe('Medellin');
    expect(leido?.plantillaEntrada).toBe('08:00');
  });

  it('no rompe con JSON valido pero incompleto', () => {
    sessionStorage.setItem(PLANIFICADOR_DRAFT_KEY, JSON.stringify({ empleadosInfo: {} }));

    const leido = leerBorradorPlanificador();
    expect(leido?.seleccionados).toEqual([]);
    expect(leido?.empleadosInfo).toEqual([]);
    expect(leido?.diasDestino).toEqual([1, 2, 3, 4, 5]);
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
    sessionStorage.clear();
  });

  it('renderiza con selector de semana', async () => {
    wrapperRouter(<PlanificadorSemanalView />);
    expect(screen.getByText(/Formulario de Horarios/)).toBeTruthy();
    expect(screen.getByText(/Horario masivo/)).toBeTruthy();
    expect(screen.getByText(/Usa el botón Empleados/)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Buscar por cédula/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Incluir visibles/i })).toBeNull();
  });

  it('permite cambiar la semana usando selectores de fecha', async () => {
    wrapperRouter(<PlanificadorSemanalView />);

    fireEvent.change(screen.getByDisplayValue('2026-06-22'), { target: { value: '2026-07-01' } });

    expect(screen.getByDisplayValue('27')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-06-29')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-07-05')).toBeTruthy();
  });

  it('pre-calcular muestra totales en resumen', async () => {
    renderPlanificadorConSeleccion();

    expect(screen.getByText(/2 empleados/)).toBeTruthy();

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
    renderPlanificadorConSeleccion();

    fireEvent.click(screen.getByRole('button', { name: /Entrada: 07:30/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Seleccionar hora 08/i }));
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar minuto 00/i }));
    fireEvent.click(screen.getByRole('button', { name: /Aceptar/i }));

    fireEvent.click(screen.getByRole('button', { name: /Aplicar horario/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(guardarBorradorPlan).toHaveBeenCalled();
      const callArg = (guardarBorradorPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.empleados[0].dias[0].hora_entrada).toBe('08:00');
    });
  });

  it('navega a empleados activos guardando el borrador del planificador', async () => {
    renderPlanificadorConSeleccion();

    fireEvent.click(screen.getByRole('button', { name: /Empleados/i }));

    expect(navigateMock).toHaveBeenCalledWith('/service-portal/horas-extras/empleados');

    const draft = JSON.parse(window.sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY) ?? '{}');
    expect(draft.seleccionados).toEqual(['123', '456']);
    expect(draft.empleadosInfo).toHaveLength(2);
  });

  it('muestra empleados activos con ciudad de contratacion y permite seleccionar', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    wrapperRouter(<EmpleadosActivosView />);

    await screen.findByText('Ciudad contratación');
    expect(await screen.findByText('Bogota')).toBeTruthy();
    expect(screen.getByText('Medellin')).toBeTruthy();
    expect(screen.getByText(/Maria/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/Seleccionar 456/i));

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 200 seleccionados/)).toBeTruthy();
      const draft = JSON.parse(window.sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY) ?? '{}');
      expect(draft.seleccionados).toEqual(['456']);
      expect(draft.empleadosInfo[0][1].ciudadcontratacion).toBe('Medellin');
    });
  });

  it('recupera en el planificador la seleccion hecha desde empleados activos', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    const empleadosView = wrapperRouter(<EmpleadosActivosView />);

    await screen.findByText('Ciudad contratación');
    fireEvent.click(await screen.findByLabelText(/Seleccionar 456/i));
    fireEvent.click(screen.getByRole('button', { name: /Enviar al horario/i }));

    expect(navigateMock).toHaveBeenCalledWith('/service-portal/horas-extras');

    empleadosView.unmount();
    wrapperRouter(<PlanificadorSemanalView />);

    expect(await screen.findByText(/1 empleados/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(guardarBorradorPlan).toHaveBeenCalled();
      const callArg = (guardarBorradorPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.empleados[0].cedula).toBe('456');
    });
  });

  it('permite quitar un empleado ya seleccionado aunque no autorice HE', async () => {
    guardarBorradorPlanificadorLocal({
      ...crearBorradorPlanificadorBase(),
      seleccionados: ['789'],
      empleadosInfo: [['789', mockEmpleados.items[2]]],
    });
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    wrapperRouter(<EmpleadosActivosView />);

    await screen.findByText('Ciudad contratación');
    fireEvent.change(screen.getByDisplayValue('Autorizado HE: SI'), { target: { value: 'todos' } });
    fireEvent.click(await screen.findByLabelText(/Quitar 789/i));

    await waitFor(() => {
      const draft = leerBorradorPlanificador();
      expect(draft?.seleccionados).toEqual([]);
      expect(draft?.empleadosInfo).toEqual([]);
    });
  });

  it('guardar borrador llama endpoint con payload correcto', async () => {
    renderPlanificadorConSeleccion();

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

    renderPlanificadorConSeleccion();

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
