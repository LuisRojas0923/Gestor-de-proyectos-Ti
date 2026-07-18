import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DefaultHorarioSemana from '../pages/ServicePortal/pages/HORAS_EXTRAS/components/DefaultHorarioSemana';
import { crearBorradorPlanificadorBase, guardarBorradorPlanificadorLocal, leerBorradorPlanificador, PLANIFICADOR_DRAFT_KEY } from '../pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft';

const dias = () => [1, 2, 3, 4, 5, 6, 7].map((dia_semana) => ({
  dia_semana, hora_entrada: '07:30', hora_salida: '17:00', minutos_almuerzo: 60,
  cruza_medianoche: false, novedades: [], asignaciones_ot: [],
}));

describe('DefaultHorarioSemana', () => {
  it('aplica a todos y permite editar la entrada', () => {
    const onChange = vi.fn();
    const onAplicar = vi.fn();
    render(<MemoryRouter><DefaultHorarioSemana dias={dias()} onChange={onChange} onAplicarATodos={onAplicar} /></MemoryRouter>);
    fireEvent.click(screen.getByText(/Aplicar a todos/));
    expect(onAplicar).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Entrada Lun: 07:30' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar hora 08' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar minuto 00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(onChange.mock.calls[0][0][0].hora_entrada).toBe('08:00');
  });
});

describe('planificadorDraft', () => {
  afterEach(() => { sessionStorage.clear(); localStorage.clear(); });

  it('guarda y lee valores normalizados', () => {
    guardarBorradorPlanificadorLocal({
      ...crearBorradorPlanificadorBase(), seleccionados: ['456'], plantillaEntrada: '08:00',
      empleadosInfo: [['456', { cedula: '456', nombre: 'Maria', cargo: 'Op', area: 'A', ciudadcontratacion: 'Medellin', quien_reporta: 'Lider', nivel_riesgo_arl: 'III', autoriza_he: true }]],
    });
    const leido = leerBorradorPlanificador();
    expect(leido?.seleccionados).toEqual(['456']);
    expect(leido?.empleadosInfo[0][1].ciudadcontratacion).toBe('Medellin');
    expect(leido?.plantillaEntrada).toBe('08:00');
  });

  it('tolera JSON válido pero incompleto', () => {
    sessionStorage.setItem(PLANIFICADOR_DRAFT_KEY, JSON.stringify({ empleadosInfo: {} }));
    const leido = leerBorradorPlanificador();
    expect(leido?.seleccionados).toEqual([]);
    expect(leido?.empleadosInfo).toEqual([]);
    expect(leido?.diasDestino).toEqual([1, 2, 3, 4, 5]);
  });

  it('descarta el borrador de otro usuario', () => {
    localStorage.setItem('user_cedula', 'analista-1');
    guardarBorradorPlanificadorLocal(crearBorradorPlanificadorBase());
    localStorage.setItem('user_cedula', 'analista-2');

    expect(leerBorradorPlanificador()).toBeNull();
    expect(sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY)).toBeNull();
  });
});
