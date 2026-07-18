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
  lunesDeSemanaIso,
  fechasDeSemanaIso,
  fechaIsoCorta,
  fechaEnRango,
} from '../pages/ServicePortal/pages/HORAS_EXTRAS/utils/horarioUtils';
import type { HorarioPactadoDia, RegistroDiario } from '../types/horasExtras';

describe('horarioUtils', () => {
  describe('esHoraValida', () => {
    it('acepta HH:MM válidos', () => {
      expect(esHoraValida('07:30')).toBe(true);
      expect(esHoraValida('07:30:00')).toBe(true);
      expect(esHoraValida('07:30:59')).toBe(true);
      expect(esHoraValida('00:00')).toBe(true);
      expect(esHoraValida('23:59')).toBe(true);
    });

    it('rechaza nulos, vacíos y formatos incorrectos', () => {
      expect(esHoraValida(null)).toBe(false);
      expect(esHoraValida(undefined)).toBe(false);
      expect(esHoraValida('')).toBe(false);
      expect(esHoraValida('25:00')).toBe(false);
      expect(esHoraValida('12:60')).toBe(false);
      expect(esHoraValida('12:30:60')).toBe(false);
      expect(esHoraValida('1230')).toBe(false);
    });
  });

  describe('calcularHorasDia', () => {
    it('caso L-J del usuario: 07:30 → 17:00 con 30min almuerzo = 9h', () => {
      expect(calcularHorasDia('07:30', '17:00', 30)).toBe(9);
      expect(calcularHorasDia('07:30:00', '17:00:00', 30)).toBe(9);
      expect(calcularHorasDia('07:30:59', '17:00:59', 30)).toBe(9);
      expect(calcularHorasDia('07:30:59', '17:00:00', 30)).toBe(9);
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

    it('cruce de medianoche incoherente no produce jornadas mayores a 24h', () => {
      expect(calcularHorasDia('07:30', '17:00', 30, true)).toBe(0);
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
        cruza_medianoche: false,
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
        cruza_medianoche: false,
      };
      const r = horarioPactadoARegistro(h);
      expect(r.hora_entrada).toBeNull();
      expect(r.hora_salida).toBeNull();
    });
  });

  describe('totalHorasSemana', () => {
    it('suma 5 días laborales (9h c/u) + 2 francos = 45h', () => {
      const dias: RegistroDiario[] = [
        { dia_semana: 1, hora_entrada: '07:30', hora_salida: '17:00', minutos_almuerzo: 30, cruza_medianoche: false },
        { dia_semana: 2, hora_entrada: '07:30', hora_salida: '17:00', minutos_almuerzo: 30, cruza_medianoche: false },
        { dia_semana: 3, hora_entrada: '07:30', hora_salida: '17:00', minutos_almuerzo: 30, cruza_medianoche: false },
        { dia_semana: 4, hora_entrada: '07:30', hora_salida: '17:00', minutos_almuerzo: 30, cruza_medianoche: false },
        { dia_semana: 5, hora_entrada: '07:30', hora_salida: '17:30', minutos_almuerzo: 30, cruza_medianoche: false },
        { dia_semana: 6, hora_entrada: null, hora_salida: null, minutos_almuerzo: 0, cruza_medianoche: false },
        { dia_semana: 7, hora_entrada: null, hora_salida: null, minutos_almuerzo: 0, cruza_medianoche: false },
      ];
      expect(totalHorasSemana(dias)).toBe(45.5);
    });

    it('calcula un turno que cruza medianoche solo con el flag explícito', () => {
      expect(calcularHorasDia('22:00', '06:00', 30, true)).toBe(7.5);
      expect(calcularHorasDia('22:00', '06:00', 30, false)).toBe(0);
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

  describe('lunesDeSemanaIso (S5ppp)', () => {
    it('W25 de 2026 es lunes 2026-06-15', () => {
      const d = lunesDeSemanaIso(2026, 25);
      expect(d.toISOString().slice(0, 10)).toBe('2026-06-15');
      expect(d.getUTCDay()).toBe(1); // lunes
    });

    it('W1 de 2026 cae en lunes', () => {
      const d = lunesDeSemanaIso(2026, 1);
      expect(d.getUTCDay()).toBe(1);
    });

    it('W53 de 2020 (año con 53 semanas) cae en lunes 2020-12-28', () => {
      const d = lunesDeSemanaIso(2020, 53);
      expect(d.toISOString().slice(0, 10)).toBe('2020-12-28');
    });
  });

  describe('fechasDeSemanaIso (S5ppp)', () => {
    it('devuelve 7 fechas consecutivas a partir del lunes', () => {
      const fs = fechasDeSemanaIso(2026, 25);
      expect(fs).toHaveLength(7);
      expect(fs.map((d) => d.toISOString().slice(0, 10))).toEqual([
        '2026-06-15',
        '2026-06-16',
        '2026-06-17',
        '2026-06-18',
        '2026-06-19',
        '2026-06-20',
        '2026-06-21',
      ]);
    });
  });

  describe('fechaIsoCorta', () => {
    it('YYYY-MM-DD en UTC', () => {
      expect(fechaIsoCorta(new Date(Date.UTC(2026, 5, 15, 12, 0, 0)))).toBe('2026-06-15');
    });
  });

  describe('fechaEnRango (S5ppp)', () => {
    it('inclusivo en ambos extremos', () => {
      expect(fechaEnRango('2026-06-15', '2026-06-15', '2026-06-17')).toBe(true);
      expect(fechaEnRango('2026-06-17', '2026-06-15', '2026-06-17')).toBe(true);
    });

    it('false fuera del rango', () => {
      expect(fechaEnRango('2026-06-14', '2026-06-15', '2026-06-17')).toBe(false);
      expect(fechaEnRango('2026-06-18', '2026-06-15', '2026-06-17')).toBe(false);
    });
  });
});
