import { describe, expect, it } from 'vitest';
import { errorTurno } from '../pages/ServicePortal/pages/HORAS_EXTRAS/utils/validarTurno';

describe('errorTurno', () => {
  it.each([
    [{ hora_entrada: '08:00', hora_salida: null, minutos_almuerzo: 0, cruza_medianoche: false }, 'juntas'],
    [{ hora_entrada: '08:00', hora_salida: '08:00', minutos_almuerzo: 0, cruza_medianoche: false }, 'iguales'],
    [{ hora_entrada: '22:00', hora_salida: '06:00', minutos_almuerzo: 0, cruza_medianoche: false }, 'Activa'],
    [{ hora_entrada: '08:00', hora_salida: '17:00', minutos_almuerzo: 0, cruza_medianoche: true }, 'requiere'],
    [{ hora_entrada: null, hora_salida: null, minutos_almuerzo: 30, cruza_medianoche: false }, 'franco'],
  ])('rechaza horarios parciales, iguales o incoherentes', (turno, mensaje) => {
    expect(errorTurno(turno)).toContain(mensaje);
  });

  it('acepta un turno nocturno coherente', () => {
    expect(errorTurno({ hora_entrada: '22:00', hora_salida: '06:00', minutos_almuerzo: 30, cruza_medianoche: true })).toBeNull();
  });
});
