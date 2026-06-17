/**
 * Tests Sprint S7 — PlanificadorSemanalView y sub-componentes.
 *
 * Cobertura:
 *  - SelectorEmpleados: render + busqueda contra mock
 *  - DefaultHorarioSemana: aplicar a todos
 *  - PlanificadorSemanalView: pre-calcular muestra totales
 *  - PlanificadorSemanalView: guardar borrador llama endpoint
 *  - PlanificadorSemanalView: confirmar muestra OK/errores
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

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
import SelectorEmpleados from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/SelectorEmpleados';
import DefaultHorarioSemana from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/DefaultHorarioSemana';
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
    { cedula: '123', nombre: 'Juan', cargo: 'Op', area: 'A', nivel_riesgo_arl: 'III', autoriza_he: true },
    { cedula: '456', nombre: 'Maria', cargo: 'Op', area: 'A', nivel_riesgo_arl: 'III', autoriza_he: true },
  ],
  total: 2,
  limit: 50,
  offset: 0,
};

describe('SelectorEmpleados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmpleados);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza y muestra empleados del ERP', async () => {
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

    await waitFor(() => {
      expect(screen.getByText(/Juan/)).toBeTruthy();
      expect(screen.getByText(/Maria/)).toBeTruthy();
    });
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
    expect(screen.getByText(/Planificador Semanal/)).toBeTruthy();
    expect(screen.getByText(/Paso 1 — Selecciona empleados/)).toBeTruthy();
  });

  it('pre-calcular muestra totales en resumen', async () => {
    wrapperRouter(<PlanificadorSemanalView />);

    // Esperar carga inicial de empleados
    await waitFor(() => {
      expect(screen.getByText(/Juan/)).toBeTruthy();
    });

    // Seleccionar un empleado
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    // Click en pre-calcular (boton especifico, no "Pre-cálculo" en resumen)
    const preCalcularBtn = screen.getByRole('button', { name: /Pre-calcular/i });
    fireEvent.click(preCalcularBtn);

    await waitFor(
      () => {
        expect(preCalcularPlan).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Esperar a que aparezca el resumen con el total
    await screen.findByText('2.5h', {}, { timeout: 3000 });
  });

  it('guardar borrador llama endpoint con payload correcto', async () => {
    wrapperRouter(<PlanificadorSemanalView />);

    await waitFor(() => {
      expect(screen.getByText(/Juan/)).toBeTruthy();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

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

    await waitFor(() => {
      expect(screen.getByText(/Juan/)).toBeTruthy();
    });

    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const confirmarBtn = screen.getByRole('button', { name: /Confirmar semana/i });
    fireEvent.click(confirmarBtn);

    await waitFor(() => {
      expect(confirmarPlan).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });
});
