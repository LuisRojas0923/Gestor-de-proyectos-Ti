import { describe, expect, it } from 'vitest';
import { obtenerOpcionesTiempoAsistencia, OPCIONES_TIEMPO_ASISTENCIA } from '../pages/ServicePortal/pages/GestionTiempoAsistencia/gestionTiempoAsistenciaConfig';

const idsVisibles = (permisos?: string[], estados: Record<string, boolean> = {}) =>
  obtenerOpcionesTiempoAsistencia(permisos, estados).map((opcion) => opcion.id);

describe('configuración de Gestión de Tiempo y Asistencia', () => {
  it.each([
    ['biometria', ['biometria']],
    ['nomina_horas_extras.planificar', ['planificador', 'pre-liquidacion']],
    ['nomina_horas_extras.leer', ['calculos', 'costos-ot', 'festivos']],
    ['nomina_horas_extras.admin', ['configuracion']],
    ['nomina_horas_extras.plantillas_horario.administrar', ['plantillas']],
    ['alcance_empleados.administrar', ['alcance']],
  ])('concede únicamente las opciones de %s', (permiso, esperadas) => {
    expect(idsVisibles([permiso])).toEqual(esperadas);
  });

  it('combina permisos sin duplicar opciones', () => {
    const opciones = idsVisibles(['biometria', 'nomina_horas_extras.planificar', 'biometria']);
    expect(opciones).toEqual(['biometria', 'planificador', 'pre-liquidacion']);
  });

  it('falla cerrado cuando no hay permisos', () => {
    expect(idsVisibles()).toEqual([]);
    expect(idsVisibles([])).toEqual([]);
  });

  it('oculta solo las opciones sujetas al estado padre de horas extras', () => {
    const permisos = [
      'biometria',
      'nomina_horas_extras.leer',
      'nomina_horas_extras.plantillas_horario.administrar',
      'alcance_empleados.administrar',
    ];

    expect(idsVisibles(permisos, { nomina_horas_extras: false })).toEqual(['biometria', 'plantillas', 'alcance']);
  });

  it('no convierte permisos de acción en permisos navegables', () => {
    expect(idsVisibles(['nomina_horas_extras.confirmar', 'nomina_horas_extras.compensar'])).toEqual([]);
  });

  it('conserva la matriz histórica exacta de ruta y permiso', () => {
    expect(OPCIONES_TIEMPO_ASISTENCIA.map(({ id, ruta, permiso }) => ({ id, ruta, permiso }))).toEqual([
      { id: 'biometria', ruta: '/service-portal/biometria', permiso: 'biometria' },
      { id: 'planificador', ruta: '/service-portal/horas-extras/planificador', permiso: 'nomina_horas_extras.planificar' },
      { id: 'plantillas', ruta: '/service-portal/horas-extras/plantillas', permiso: 'nomina_horas_extras.plantillas_horario.administrar' },
      { id: 'pre-liquidacion', ruta: '/service-portal/horas-extras/pre-liquidacion', permiso: 'nomina_horas_extras.planificar' },
      { id: 'calculos', ruta: '/service-portal/horas-extras/calculos', permiso: 'nomina_horas_extras.leer' },
      { id: 'costos-ot', ruta: '/service-portal/horas-extras/costos-ot', permiso: 'nomina_horas_extras.leer' },
      { id: 'festivos', ruta: '/service-portal/horas-extras/festivos', permiso: 'nomina_horas_extras.leer' },
      { id: 'configuracion', ruta: '/service-portal/horas-extras/configuracion', permiso: 'nomina_horas_extras.admin' },
      { id: 'alcance', ruta: '/service-portal/alcance-empleados', permiso: 'alcance_empleados.administrar' },
    ]);
  });

  it('diferencia la calculadora individual del planificador semanal', () => {
    const calculadora = OPCIONES_TIEMPO_ASISTENCIA.find((opcion) => opcion.id === 'pre-liquidacion');
    const planificador = OPCIONES_TIEMPO_ASISTENCIA.find((opcion) => opcion.id === 'planificador');

    expect(calculadora?.titulo).toBe('Calculadora individual de horas extras');
    expect(calculadora?.descripcion).toContain('un empleado');
    expect(planificador?.titulo).toBe('Planificador semanal');
  });

  it('no expone empleados como acceso separado del planificador', () => {
    expect(OPCIONES_TIEMPO_ASISTENCIA.some((opcion) => opcion.id === 'empleados')).toBe(false);
  });

  it('no expone novedades como acceso separado del planificador', () => {
    expect(OPCIONES_TIEMPO_ASISTENCIA.some((opcion) => opcion.id === 'novedades')).toBe(false);
  });

  it('no expone la bolsa de horas como acceso operativo', () => {
    expect(OPCIONES_TIEMPO_ASISTENCIA.some((opcion) => opcion.id === 'bolsa')).toBe(false);
  });

  it('no expone el horario individual como acceso separado del planificador', () => {
    expect(OPCIONES_TIEMPO_ASISTENCIA.some((opcion) => opcion.id === 'horario')).toBe(false);
  });
});
