/**
 * Tests Sprint S7 — PlanificadorSemanalView y sub-componentes.
 *
 * Cobertura:
 *  - DefaultHorarioSemana: aplicar a todos
 *  - PlanificadorSemanalView: aplica horario masivo y pre-calcula
 *  - PlanificadorSemanalView: tabla unica de empleados + horarios y subfiltros
 *  - PlanificadorSemanalView: incluir visibles, limpiar seleccion y ruta legacy
 *  - PlanificadorSemanalView: guardar borrador llama endpoint
 *  - PlanificadorSemanalView: confirmar muestra OK/errores
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  buscarOtManoObra: vi.fn(),
  preCalcularPlan: vi.fn(),
  guardarBorradorPlan: vi.fn(),
  confirmarPlan: vi.fn(),
}));

import PlanificadorSemanalView from '../pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView';
import EmpleadosActivosView from '../pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView';
import {
  crearBorradorPlanificadorBase,
  guardarBorradorPlanificadorLocal,
  leerBorradorPlanificador,
  PLANIFICADOR_DRAFT_KEY,
} from '../pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft';
import {
  buscarEmpleadosERP,
  buscarOtManoObra,
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

const mockEmpleadosTellez = {
  items: [
    { cedula: '101', nombre: 'RODRIGUEZ ALVAREZ ANA', cargo: 'Op', area: 'A', ciudadcontratacion: 'Bogota', quien_reporta: 'Lider Uno', nivel_riesgo_arl: 'III', autoriza_he: true },
    { cedula: '102', nombre: 'RODRIGUEZ BARRERA LUIS', cargo: 'Op', area: 'A', ciudadcontratacion: 'Bogota', quien_reporta: 'Lider Uno', nivel_riesgo_arl: 'III', autoriza_he: true },
    { cedula: '103', nombre: 'RODRIGUEZ TELLEZ EDWAR GERMAN', cargo: 'Op', area: 'A', ciudadcontratacion: 'Bogota', quien_reporta: 'Lider Uno', nivel_riesgo_arl: 'III', autoriza_he: true },
    { cedula: '104', nombre: 'RODRIGUEZ TELLEZ OSCAR JAVIER', cargo: 'Op', area: 'A', ciudadcontratacion: 'Bogota', quien_reporta: 'Lider Uno', nivel_riesgo_arl: 'III', autoriza_he: true },
  ],
  total: 4,
  limit: 25,
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

describe('PlanificadorSemanalView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockClear();
    localStorage.setItem('token', TOKEN);
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmpleados);
    (buscarOtManoObra as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [
        {
          orden: '1007',
          cc: '3080',
          scc: '10',
          sub_indice: '300',
          categoria_sub_indice: 'MANO DE OBRA',
          descripcion: 'Mantenimiento preventivo puertas',
          vr_contratado: 5507000,
          estado: 'TERMINADO',
          cliente: 'COLCAFE',
        },
      ],
      total: 1,
      limit: 8,
      offset: 0,
    });
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
    expect(screen.getByRole('button', { name: /Entrada: 07:30/i })).toBeTruthy();
    expect(screen.getByText(/Empleados y horarios/)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Buscar por cédula/)).toBeNull();
    expect(screen.getByRole('button', { name: /Seleccionar visibles/i })).toBeTruthy();
    await waitFor(() => expect(buscarEmpleadosERP).toHaveBeenCalled());
  });

  it('permite cambiar la semana usando selectores de fecha', async () => {
    wrapperRouter(<PlanificadorSemanalView />);

    const fechaInicioInput = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)[0];
    fireEvent.change(fechaInicioInput, { target: { value: '2026-07-01' } });

    expect(screen.getByDisplayValue('2026-06-29')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-07-05')).toBeTruthy();
    await waitFor(() => expect(buscarEmpleadosERP).toHaveBeenCalled());
  });

  it('pre-calcular muestra totales en resumen', async () => {
    renderPlanificadorConSeleccion();

    expect(screen.getAllByText(/2 empleados/).length).toBeGreaterThan(0);

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

    fireEvent.click(screen.getByRole('button', { name: /^Aplicar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(guardarBorradorPlan).toHaveBeenCalled();
      const callArg = (guardarBorradorPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.empleados[0].dias[0].hora_entrada).toBe('08:00');
    });
  });

  it('no llama APIs cuando un día tiene un turno nocturno incoherente', async () => {
    guardarBorradorPlanificadorLocal({
      ...crearBorradorPlanificadorBase(),
      seleccionados: ['123'],
      empleadosInfo: [['123', mockEmpleados.items[0]]],
      overrides: [['123', [1, 2, 3, 4, 5, 6, 7].map((dia_semana) => ({
        dia_semana, hora_entrada: '22:00', hora_salida: '06:00', minutos_almuerzo: 0,
        cruza_medianoche: false, novedades: [], asignaciones_ot: [],
      }))]],
    });
    wrapperRouter(<PlanificadorSemanalView />);
    await screen.findByText('Operación');
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));
    fireEvent.click(screen.getByRole('button', { name: /Pre-calcular/i }));
    expect(guardarBorradorPlan).not.toHaveBeenCalled();
    expect(preCalcularPlan).not.toHaveBeenCalled();
  });

  it('aplica horario y novedad masiva desde el mismo boton', async () => {
    renderPlanificadorConSeleccion();

    fireEvent.click(screen.getByRole('button', { name: /Novedad: Sin novedad/i }));
    fireEvent.click(await screen.findByText('INC'));
    fireEvent.click(screen.getByRole('button', { name: /Aplicar \+ INC/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(guardarBorradorPlan).toHaveBeenCalled();
      const callArg = (guardarBorradorPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.empleados[0].dias[0].novedades[0]).toMatchObject({
        codigo_novedad: 'INC',
      });
    });
  });

  it('limpia la novedad masiva previa al aplicar sin novedad', async () => {
    renderPlanificadorConSeleccion();

    fireEvent.click(screen.getByRole('button', { name: /Novedad: Sin novedad/i }));
    fireEvent.click(await screen.findByText('INC'));
    fireEvent.click(screen.getByRole('button', { name: /Aplicar \+ INC/i }));

    fireEvent.click(screen.getByRole('button', { name: /Novedad: INC/i }));
    fireEvent.click(await screen.findByText('Sin novedad'));
    fireEvent.click(screen.getByRole('button', { name: /^Aplicar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(guardarBorradorPlan).toHaveBeenCalled();
      const callArg = (guardarBorradorPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.empleados[0].dias[0].novedades).toEqual([]);
    });
  });

  it('aplica OT masiva a empleados y dias seleccionados antes de guardar', async () => {
    renderPlanificadorConSeleccion();

    fireEvent.change(screen.getByPlaceholderText(/Buscar OT masiva/i), { target: { value: '1007' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar OT masiva/i }));

    await waitFor(() => expect(buscarOtManoObra).toHaveBeenCalledWith('1007', 8, 0, TOKEN));
    fireEvent.click(await screen.findByText(/^OT 1007$/i));
    fireEvent.change(screen.getByLabelText(/Horas OT masiva 1007/i), { target: { value: '4005' } });
    fireEvent.click(screen.getByRole('button', { name: /^Aplicar OT$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(guardarBorradorPlan).toHaveBeenCalled();
      const callArg = (guardarBorradorPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.empleados[0].dias[0].asignaciones_ot[0]).toMatchObject({
        orden: '1007',
        cc: '3080',
        scc: '10',
        sub_indice: '300',
      });
      expect(callArg.empleados[0].dias[0].asignaciones_ot[0].horas).toBe(9);
      expect(callArg.empleados[1].dias[4].asignaciones_ot[0].orden).toBe('1007');
    });
  });

  it('muestra empleados y horarios en una sola tabla sin navegar', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });
    renderPlanificadorConSeleccion();

    expect(await screen.findByText('Operación')).toBeTruthy();
    expect(screen.getAllByText('Lun').length).toBeGreaterThan(0);
    expect(screen.getByText('Total HE')).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalledWith('/service-portal/horas-extras/empleados');
  });

  it('muestra empleados activos integrados con ciudad de contratacion y permite seleccionar', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    wrapperRouter(<PlanificadorSemanalView />);

    await screen.findByText('Operación');
    expect(await screen.findByText(/Bogota/)).toBeTruthy();
    expect(screen.getByText(/Medellin/)).toBeTruthy();
    expect(screen.getByText(/Maria/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/Seleccionar 456/i));

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 2 seleccionados/)).toBeTruthy();
      const draft = JSON.parse(window.sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY) ?? '{}');
      expect(draft.seleccionados).toEqual(['456']);
      expect(draft.empleadosInfo[0][1].ciudadcontratacion).toBe('Medellin');
    });
  });

  it('muestra subfiltros independientes para nombre, cedula y cargo del empleado', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    wrapperRouter(<PlanificadorSemanalView />);

    fireEvent.click(await screen.findByRole('button', { name: /^Empleado$/i }));

    expect(screen.getByRole('button', { name: /^Nombre$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Cédula$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Cargo$/i })).toBeTruthy();
  });

  it('busca empleados en base de datos desde el filtro de columna', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ...mockEmpleados, limit: 25 })
      .mockResolvedValueOnce({ items: [mockEmpleados.items[1]], total: 1, limit: 25, offset: 0 });

    wrapperRouter(<PlanificadorSemanalView />);

    fireEvent.click(await screen.findByRole('button', { name: /^Empleado$/i }));
    fireEvent.change(screen.getByPlaceholderText(/^Buscar\.\.\.$/i), { target: { value: 'Maria' } });

    await waitFor(() => {
      expect(buscarEmpleadosERP).toHaveBeenCalledWith('Maria', 25, 0, TOKEN, true);
    });
  });

  it('mantiene seleccionados del filtro aunque la busqueda remota muestre solo algunos', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockImplementation((q) => Promise.resolve(
      q === 'tellez'
        ? { ...mockEmpleadosTellez, items: mockEmpleadosTellez.items.slice(2), total: 2 }
        : mockEmpleadosTellez,
    ));

    wrapperRouter(<PlanificadorSemanalView />);

    fireEvent.click(await screen.findByRole('button', { name: /^Empleado$/i }));
    fireEvent.click(screen.getByText(/Seleccionar Todos/i));
    fireEvent.click(screen.getAllByRole('button', { name: /^Aplicar$/i }).at(-1)!);

    await waitFor(() => expect(screen.getByText(/RODRIGUEZ ALVAREZ ANA/i)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /^Empleado$/i }));
    fireEvent.change(screen.getByPlaceholderText(/^Buscar\.\.\.$/i), { target: { value: 'tellez' } });
    await waitFor(() => expect(buscarEmpleadosERP).toHaveBeenCalledWith('tellez', 25, 0, TOKEN, true));
    fireEvent.click(screen.getAllByRole('button', { name: /^Aplicar$/i }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByText(/RODRIGUEZ ALVAREZ ANA/i)).toBeTruthy();
      expect(screen.getByText(/RODRIGUEZ BARRERA LUIS/i)).toBeTruthy();
      expect(screen.getByText(/RODRIGUEZ TELLEZ EDWAR GERMAN/i)).toBeTruthy();
      expect(screen.getByText(/RODRIGUEZ TELLEZ OSCAR JAVIER/i)).toBeTruthy();
    });
  });

  it('incluye empleados visibles autorizados desde el panel integrado', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    wrapperRouter(<PlanificadorSemanalView />);

    await screen.findByText('Operación');
    fireEvent.click(screen.getByRole('button', { name: /Seleccionar visibles/i }));

    await waitFor(() => {
      expect(screen.getByText(/2 \/ 2 seleccionados/)).toBeTruthy();
      const draft = leerBorradorPlanificador();
      expect(draft?.seleccionados).toEqual(['123', '456']);
      expect(draft?.empleadosInfo).toHaveLength(2);
    });
  });

  it('limpia la seleccion desde el panel integrado', async () => {
    guardarSeleccionPlanificador();
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    wrapperRouter(<PlanificadorSemanalView />);

    await screen.findByText('Operación');
    fireEvent.click(screen.getByRole('button', { name: /Limpiar selección/i }));

    await waitFor(() => {
      expect(screen.getByText(/0 \/ 2 seleccionados/)).toBeTruthy();
      const draft = leerBorradorPlanificador();
      expect(draft?.seleccionados).toEqual([]);
      expect(draft?.empleadosInfo).toEqual([]);
    });
  });

  it('usa en el planificador la seleccion hecha desde el panel integrado', async () => {
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    wrapperRouter(<PlanificadorSemanalView />);

    await screen.findByText('Operación');
    fireEvent.click(await screen.findByLabelText(/Seleccionar 456/i));

    await waitFor(() => expect(screen.getAllByText(/1 empleados/).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/i }));

    await waitFor(() => {
      expect(guardarBorradorPlan).toHaveBeenCalled();
      const callArg = (guardarBorradorPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.empleados[0].cedula).toBe('456');
    });
  });

  it('permite quitar un empleado ya seleccionado aunque no autorice HE desde el panel integrado', async () => {
    guardarBorradorPlanificadorLocal({
      ...crearBorradorPlanificadorBase(),
      seleccionados: ['789'],
      empleadosInfo: [['789', mockEmpleados.items[2]]],
    });
    (buscarEmpleadosERP as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockEmpleados,
      limit: 100,
    });

    wrapperRouter(<PlanificadorSemanalView />);

    await screen.findByText('Operación');
    fireEvent.click(await screen.findByLabelText(/Quitar 789/i));

    await waitFor(() => {
      const draft = leerBorradorPlanificador();
      expect(draft?.seleccionados).toEqual([]);
      expect(draft?.empleadosInfo).toEqual([]);
    });
  });

  it('redirige la ruta legacy de empleados al planificador con panel abierto', async () => {
    render(
      <MemoryRouter initialEntries={['/service-portal/horas-extras/empleados']}>
        <Routes>
          <Route path="/service-portal/horas-extras/empleados" element={<EmpleadosActivosView />} />
          <Route path="/service-portal/horas-extras" element={<PlanificadorSemanalView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Empleados y horarios/)).toBeTruthy();
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
