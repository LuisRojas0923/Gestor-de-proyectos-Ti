import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: vi.fn() }),
}));
vi.mock('../services/horasExtrasService', () => ({
  buscarEmpleadosERP: vi.fn(),
  buscarOtManoObra: vi.fn(),
  preCalcularPlan: vi.fn(),
  guardarBorradorPlan: vi.fn(),
  confirmarPlan: vi.fn(),
}));

import PlanificadorSemanalView from '../pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView';
import {
  crearBorradorPlanificadorBase,
  guardarBorradorPlanificadorLocal,
  PLANIFICADOR_DRAFT_KEY,
  type PlanificadorDraft,
} from '../pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft';
import { buscarEmpleadosERP, preCalcularPlan } from '../services/horasExtrasService';
import type { PlanDiaIn } from '../types/horasExtrasPlanificador';

const empleado = {
  cedula: '123', nombre: 'Juan', cargo: 'Op', area: 'A', ciudadcontratacion: 'Bogota',
  quien_reporta: 'Lider', nivel_riesgo_arl: 'III', autoriza_he: true,
  disponible_semana: true, motivo_no_disponible: null,
};

const renderConSeleccion = (overrides: PlanificadorDraft['overrides'] = []) => {
  guardarBorradorPlanificadorLocal({
    ...crearBorradorPlanificadorBase(),
    seleccionados: ['123'],
    empleadosInfo: [['123', empleado]],
    overrides,
  });
  return render(<MemoryRouter><PlanificadorSemanalView /></MemoryRouter>);
};

describe('Planificador semanal festivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'fake-token'); // @audit-ok: token dummy
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [empleado], total: 1, limit: 25, offset: 0,
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('limpia selección y borrador al cambiar de semana', async () => {
    renderConSeleccion();
    const fechaInicio = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)[0];
    fireEvent.change(fechaInicio, { target: { value: '2026-07-01' } });

    expect(screen.getByDisplayValue('2026-06-29')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/0 \/ 1 seleccionados/)).toBeTruthy());
    const draftActual = JSON.parse(window.sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY) ?? '{}');
    expect(draftActual.seleccionados).toEqual([]);
    expect(draftActual.semanaIso).toBe(27);
  });

  it('muestra simultáneamente HF y HEFD con nombre accesible', async () => {
    (preCalcularPlan as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      empleados: [{
        cedula: '123', total_horas_trabajadas: 8.5, total_horas_ordinarias: 8,
        total_horas_extras: 0.5, total_horas_festivas: 8, total_costo_estimado: 50000,
        detalle_por_dia: [{
          dia: 'LUNES', dia_semana: 1, horas_trabajadas: 8.5,
          horas_ordinarias: 8, horas_extras: 0.5, codigo_he: 'HEFD',
          es_festivo: true, novedad_codigo: null, costo_estimado: 50000,
          conceptos: [
            { codigo: 'HF', horas: 8, costo_estimado: 40000 },
            { codigo: 'HEFD', horas: 0.5, costo_estimado: 10000 },
          ],
        }],
      }],
      resumen: {
        total_horas_extras: 0.5, total_horas_festivas: 8,
        total_costo_estimado: 50000, empleados_count: 1,
      },
    });
    renderConSeleccion();

    fireEvent.click(screen.getByRole('button', { name: /Pre-calcular/i }));

    expect(await screen.findByText('HF + HEFD')).toBeTruthy();
    expect(await screen.findByText('8.0h')).toBeTruthy();
    expect(screen.getByText('Horas festivas')).toBeTruthy();
    expect(screen.getByRole('button', {
      name: /conceptos HF y HEFD, 0.5 horas extra/i,
    })).toBeTruthy();
  });

  it('no muestra HF si el festivo no produjo conceptos', async () => {
    (preCalcularPlan as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      empleados: [{
        cedula: '123', total_horas_trabajadas: 0, total_horas_ordinarias: 0,
        total_horas_extras: 0, total_horas_festivas: 0, total_costo_estimado: 0,
        detalle_por_dia: [{
          dia: 'LUNES', dia_semana: 1, horas_trabajadas: 0, horas_ordinarias: 0,
          horas_extras: 0, codigo_he: null, es_festivo: true,
          novedad_codigo: 'INC', costo_estimado: 0, conceptos: [],
        }],
      }],
      resumen: {
        total_horas_extras: 0, total_horas_festivas: 0,
        total_costo_estimado: 0, empleados_count: 1,
      },
    });
    renderConSeleccion();

    fireEvent.click(screen.getByRole('button', { name: /Pre-calcular/i }));

    await screen.findByText('Horas festivas');
    expect(screen.queryByText(/^HF$/)).toBeNull();
  });

  it('migra un borrador anterior sin conceptos ni total festivo', async () => {
    const draft = {
      ...crearBorradorPlanificadorBase(),
      seleccionados: ['123'],
      empleadosInfo: [['123', empleado]],
      preCalculo: {
        empleados: [{
          cedula: '123', total_horas_trabajadas: 8, total_horas_ordinarias: 8,
          total_horas_extras: 0, total_costo_estimado: 40000,
          detalle_por_dia: [{
            dia: 'LUNES', dia_semana: 1, horas_trabajadas: 8,
            horas_ordinarias: 8, horas_extras: 0, codigo_he: 'HF',
            es_festivo: true, novedad_codigo: null, costo_estimado: 40000,
          }],
        }],
        resumen: { total_horas_extras: 0, total_costo_estimado: 40000, empleados_count: 1 },
      },
    };
    sessionStorage.setItem(PLANIFICADOR_DRAFT_KEY, JSON.stringify(draft));

    render(<MemoryRouter><PlanificadorSemanalView /></MemoryRouter>);

    expect(await screen.findByText('Horas festivas')).toBeTruthy();
    expect(screen.getByText('HF')).toBeTruthy();
  });

  it('muestra horarios en una vista tabular y aplica actividad por días', async () => {
    const dias: PlanDiaIn[] = [1, 2, 3, 4, 5].map((diaSemana) => ({
      dia_semana: diaSemana, hora_entrada: '07:30', hora_salida: '17:00',
      minutos_almuerzo: 30, cruza_medianoche: false, novedades: [], asignaciones_ot: [],
    }));
    dias[0].asignaciones_ot = [{
      orden: '1007', cc: '3080', scc: '10', sub_indice: '300',
      categoria_sub_indice: 'MANO DE OBRA', cliente: 'COLCAFE', horas: 9,
    }];
    renderConSeleccion([['123', dias]]);

    fireEvent.click(screen.getByRole('button', { name: /Vista tabular/i }));

    expect(await screen.findByText('Cédula')).toBeTruthy();
    expect(screen.getByText('Cliente')).toBeTruthy();
    expect(screen.getByText('OS / OT')).toBeTruthy();
    expect(screen.getByText('CC costo')).toBeTruthy();
    expect(screen.getByText('Total laborado')).toBeTruthy();
    expect(screen.getByText('COLCAFE')).toBeTruthy();
    expect(screen.getByText('1007')).toBeTruthy();
    expect(screen.getByText('3080')).toBeTruthy();
    expect(screen.getAllByText('9:00')).toHaveLength(5);
    expect(screen.getAllByRole('button', { name: /Editar Juan/i })).toHaveLength(5);
    expect(screen.getAllByText('Juan').length).toBeGreaterThan(0);
    const actividad = screen.getByLabelText('Actividad para los días seleccionados');
    fireEvent.change(actividad, {
      target: { value: 'Mantenimiento preventivo del sistema' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar actividad/i }));

    await waitFor(() => {
      const celdasActividad = screen.getAllByText('Mantenimiento preventivo del sistema')
        .filter((elemento) => elemento.tagName !== 'TEXTAREA');
      expect(celdasActividad).toHaveLength(5);
      const draftActual = JSON.parse(window.sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY) ?? '{}');
      expect(draftActual.overrides[0][1].filter((dia: { actividad?: string }) => dia.actividad).length).toBe(5);
    });
  });

  it('descarta un pre-cálculo tardío de la semana anterior', async () => {
    let resolverPreCalculo: ((value: unknown) => void) | undefined;
    (preCalcularPlan as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise((resolve) => { resolverPreCalculo = resolve; }),
    );
    renderConSeleccion();
    fireEvent.click(screen.getByRole('button', { name: /Pre-calcular/i }));
    const fechaInicio = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)[0];
    fireEvent.change(fechaInicio, { target: { value: '2026-07-01' } });
    resolverPreCalculo?.({
      empleados: [],
      resumen: {
        total_horas_extras: 1, total_horas_festivas: 8,
        total_costo_estimado: 1000, empleados_count: 1,
      },
    });

    await waitFor(() => expect(screen.queryByText('Resumen del plan')).toBeNull());
  });

  it('descarta una página tardía de la semana anterior', async () => {
    let resolverPaginaAnterior: ((value: unknown) => void) | undefined;
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ items: [empleado], total: 2, limit: 25, offset: 0 })
      .mockImplementationOnce(() => new Promise((resolve) => { resolverPaginaAnterior = resolve; }))
      .mockResolvedValueOnce({
        items: [{ ...empleado, cedula: '999', nombre: 'Empleado nuevo' }],
        total: 1, limit: 25, offset: 0,
      });
    const { container } = renderConSeleccion();
    await screen.findByText('Juan');
    const body = container.querySelector('.overflow-y-auto.custom-scrollbar') as HTMLDivElement;
    Object.defineProperties(body, {
      scrollHeight: { value: 500, configurable: true },
      clientHeight: { value: 300, configurable: true },
      scrollTop: { value: 190, configurable: true },
    });
    fireEvent.scroll(body);
    await waitFor(() => expect(buscarEmpleadosERP).toHaveBeenCalledTimes(2));

    const fechaInicio = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)[0];
    fireEvent.change(fechaInicio, { target: { value: '2026-07-01' } });
    await screen.findByText('Empleado nuevo');
    resolverPaginaAnterior?.({
      items: [{ ...empleado, cedula: '888', nombre: 'Empleado obsoleto' }],
      total: 2, limit: 25, offset: 1,
    });

    await waitFor(() => expect(screen.queryByText('Empleado obsoleto')).toBeNull());
  });
});
