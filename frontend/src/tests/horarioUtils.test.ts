/**
 * Tests de las utilidades puras para manipular horarios.
 *
 * Verifican que el cálculo de horas trabajadas (espejo del backend
 * `_aplicar_registro_diario`) es correcto y robusto a entradas inválidas.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularHorasDia,
  horarioPactadoARegistro,
  totalHorasSemana,
  labelDia,
  DIAS_LABELS,
  esHoraValida,
} from '../pages/ServicePortal/pages/HORAS_EXTRAS/utils/horarioUtils';
import type { HorarioPactadoDia, RegistroDiario } from '../types/horasExtras';

describe('horarioUtils', () => {
  describe('esHoraValida', () => {
    it('acepta HH:MM válidos', () => {
      expect(esHoraValida('07:30')).toBe(true);
      expect(esHoraValida('00:00')).toBe(true);
      expect(esHoraValida('23:59')).toBe(true);
    });

    it('rechaza nulos, vacíos y formatos incorrectos', () => {
      expect(esHoraValida(null)).toBe(false);
      expect(esHoraValida(undefined)).toBe(false);
      expect(esHoraValida('')).toBe(false);
      expect(esHoraValida('25:00')).toBe(false);
      expect(esHoraValida('12:60')).toBe(false);
      expect(esHoraValida('1230')).toBe(false);
    });
  });

  describe('calcularHorasDia', () => {
    it('caso L-J del usuario: 07:30 → 17:00 con 30min almuerzo = 9h', () => {
      expect(calcularHorasDia('07:30', '17:00', 30)).toBe(9);
    });

    it('caso viernes: 07:30 → 17:30 con 30min almuerzo = 9.5h', () => {
      expect(calcularHorasDia('07:30', '17:30', 30)).toBe(9.5);
    });

    it('caso jornada normal de 8h: 08:00 → 17:00 con 60min almuerzo = 8h', () => {
      expect(calcularHorasDia('08:00', '17:00', 60)).toBe(8);
    });

    it('descansa 45min: 08:00 → 17:00 con 45min = 8.25h', () => {
      expect(calcularHorasDia('08:00', '17:00', 45)).toBe(8.25);
    });

    it('día libre: entrada o salida null → 0h', () => {
      expect(calcularHorasDia(null, '17:00', 30)).toBe(0);
      expect(calcularHorasDia('08:00', null, 30)).toBe(0);
      expect(calcularHorasDia(null, null, 0)).toBe(0);
    });

    it('salida <= entrada → 0h (caso de datos corruptos)', () => {
      expect(calcularHorasDia('17:00', '08:00', 0)).toBe(0);
      expect(calcularHorasDia('10:00', '10:00', 0)).toBe(0);
    });

    it('horas en punto y media con redondeo a 2 decimales', () => {
      // 08:00 → 12:30 con 0min = 4.5h
      expect(calcularHorasDia('08:00', '12:30', 0)).toBe(4.5);
    });
  });

  describe('horarioPactadoARegistro', () => {
    it('convierte un HorarioPactadoDia del backend a RegistroDiario', () => {
      const h: HorarioPactadoDia = {
        dia_semana: 3,
        hora_entrada: '08:00',
        hora_salida: '17:00',
        minutos_almuerzo: 45,
      };
      const r: RegistroDiario = horarioPactadoARegistro(h);
      expect(r).toEqual(h);
    });

    it('preserva nulls en días francos', () => {
      const h: HorarioPactadoDia = {
        dia_semana: 6,
        hora_entrada: null,
        hora_salida: null,
        minutos_almuerzo: 0,
      };
      const r = horarioPactadoARegistro(h);
      expect(r.hora_entrada).toBeNull();
      expect(r.hora_salida).toBeNull();
    });
  });

  describe('totalHorasSemana', () => {
    it('suma 5 días laborales (9h c/u) + 2 francos = 45h', () => {
      const dias: RegistroDiario[] = [
        { dia_semana: 1, hora_entrada: '07:30', hora_salida: '17:00', minutos_almuerzo: 30 },
        { dia_semana: 2, hora_entrada: '07:30', hora_salida: '17:00', minutos_almuerzo: 30 },
        { dia_semana: 3, hora_entrada: '07:30', hora_salida: '17:00', minutos_almuerzo: 30 },
        { dia_semana: 4, hora_entrada: '07:30', hora_salida: '17:00', minutos_almuerzo: 30 },
        { dia_semana: 5, hora_entrada: '07:30', hora_salida: '17:30', minutos_almuerzo: 30 },
        { dia_semana: 6, hora_entrada: null, hora_salida: null, minutos_almuerzo: 0 },
        { dia_semana: 7, hora_entrada: null, hora_salida: null, minutos_almuerzo: 0 },
      ];
      expect(totalHorasSemana(dias)).toBe(45.5);
    });

    it('semana vacía → 0', () => {
      expect(totalHorasSemana([])).toBe(0);
    });
  });

  describe('labelDia', () => {
    it('mapea 1-7 a Lun-Dom', () => {
      expect(DIAS_LABELS).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
      for (let i = 1; i <= 7; i++) {
        expect(labelDia(i)).toBe(DIAS_LABELS[i - 1]);
      }
    });

    it('fuera de rango devuelve fallback', () => {
      expect(labelDia(0)).toBe('D0');
      expect(labelDia(8)).toBe('D8');
    });
  });
});
