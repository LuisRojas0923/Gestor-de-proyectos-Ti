/**
 * Utilidades puras para manipular horarios en formato HH:MM.
 *
 * Mismas reglas que el backend `_aplicar_registro_diario`:
 *   - días libres: hora_entrada o hora_salida null → 0h
 *   - horas_trabajadas = (salida - entrada) - almuerzo, en horas
 *   - entrada/salida en HH:MM o HH:MM:SS
 *   - almuerzo en minutos (0-240)
 */
import type { RegistroDiario, HorarioPactadoDia } from '../../../../types/horasExtras';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

const toMinutes = (hhmm: string): number => {
  const m = HHMM.exec(hhmm);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
};

export const esHoraValida = (hhmm: string | null | undefined): hhmm is string =>
  typeof hhmm === 'string' && HHMM.test(hhmm);

/**
 * Calcula horas trabajadas (en horas, redondeo a 2 decimales) para un día.
 * Devuelve 0 si falta entrada o salida (día libre).
 */
export const calcularHorasDia = (
  horaEntrada: string | null,
  horaSalida: string | null,
  minutosAlmuerzo: number,
  cruzaMedianoche = false,
): number => {
  if (!esHoraValida(horaEntrada) || !esHoraValida(horaSalida)) return 0;
  const entrada = toMinutes(horaEntrada);
  let salida = toMinutes(horaSalida);
  if (cruzaMedianoche) {
    if (salida >= entrada) return 0;
    salida += 24 * 60;
  } else if (salida <= entrada) {
    return 0;
  }
  const minutosBrutos = salida - entrada;
  if (minutosBrutos <= 0) return 0;
  const minutosEfectivos = minutosBrutos - Math.max(0, minutosAlmuerzo);
  return Math.round(Math.max(0, minutosEfectivos / 60) * 100) / 100;
};

/**
 * Convierte un HorarioPactadoDia del backend (strings HH:MM) a un
 * RegistroDiario listo para enviar en la pre-liquidación. Útil para
 * pre-llenar el formulario desde el horario pactado.
 */
export const horarioPactadoARegistro = (h: HorarioPactadoDia): RegistroDiario => ({
  dia_semana: h.dia_semana,
  hora_entrada: h.hora_entrada,
  hora_salida: h.hora_salida,
  minutos_almuerzo: h.minutos_almuerzo,
  cruza_medianoche: h.cruza_medianoche,
});

/** Suma horas trabajadas en una semana (7 días). */
export const totalHorasSemana = (registro: RegistroDiario[]): number =>
  registro.reduce(
    (acc, r) =>
      acc + calcularHorasDia(r.hora_entrada, r.hora_salida, r.minutos_almuerzo, r.cruza_medianoche),
    0,
  );

/** Etiqueta corta del día (1-7 → Lun-Dom). */
export const DIAS_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export const labelDia = (diaSemana: number): string =>
  DIAS_LABELS[diaSemana - 1] ?? `D${diaSemana}`;

/**
 * Devuelve el lunes de la semana ISO (anio, semana) como Date en UTC.
 * Espejo del backend `_lunes_de_semana_iso` (date.fromisocalendar).
 */
export const lunesDeSemanaIso = (anio: number, semanaIso: number): Date => {
  // Truco: 4 de enero siempre está en la semana 1 según ISO 8601.
  // Buscamos el lunes de esa semana y luego avanzamos (semanaIso - 1) * 7 días.
  const jan4 = new Date(Date.UTC(anio, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 1=lun, 7=dom
  const lunesW1 = new Date(jan4);
  lunesW1.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  lunesW1.setUTCDate(lunesW1.getUTCDate() + (semanaIso - 1) * 7);
  return lunesW1;
};

/**
 * Devuelve las 7 fechas (Date, UTC) de la semana empezando en lunes.
 */
export const fechasDeSemanaIso = (anio: number, semanaIso: number): Date[] => {
  const lunes = lunesDeSemanaIso(anio, semanaIso);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setUTCDate(lunes.getUTCDate() + i);
    return d;
  });
};

/**
 * Formato ISO YYYY-MM-DD de una fecha UTC (sin ajuste de timezone).
 */
export const fechaIsoCorta = (d: Date): string => d.toISOString().slice(0, 10);

/** Obtiene año ISO y semana ISO desde una fecha YYYY-MM-DD. */
export const semanaIsoDesdeFecha = (fechaIso: string): { anio: number; semanaIso: number } | null => {
  const [year, month, day] = fechaIso.split('-').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;

  const weekday = date.getUTCDay() || 7;
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - weekday);

  const isoYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return { anio: isoYear, semanaIso: week };
};

/**
 * S5''' — Determina si una fecha cae en el rango [inicio, fin] inclusivo.
 * Las fechas son strings YYYY-MM-DD.
 */
export const fechaEnRango = (
  fecha: string,
  inicio: string,
  fin: string,
): boolean => fecha >= inicio && fecha <= fin;
