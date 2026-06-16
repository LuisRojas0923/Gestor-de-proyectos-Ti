/**
 * Utilidades puras para manipular horarios en formato HH:MM.
 *
 * Mismas reglas que el backend `_aplicar_registro_diario`:
 *   - días libres: hora_entrada o hora_salida null → 0h
 *   - horas_trabajadas = (salida - entrada) - almuerzo, en horas
 *   - entrada/salida en HH:MM
 *   - almuerzo en minutos (0-240)
 */
import type { RegistroDiario, HorarioPactadoDia } from '../../../../types/horasExtras';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
): number => {
  if (!esHoraValida(horaEntrada) || !esHoraValida(horaSalida)) return 0;
  const minutosBrutos = toMinutes(horaSalida) - toMinutes(horaEntrada);
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
});

/** Suma horas trabajadas en una semana (7 días). */
export const totalHorasSemana = (registro: RegistroDiario[]): number =>
  registro.reduce(
    (acc, r) =>
      acc + calcularHorasDia(r.hora_entrada, r.hora_salida, r.minutos_almuerzo),
    0,
  );

/** Etiqueta corta del día (1-7 → Lun-Dom). */
export const DIAS_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export const labelDia = (diaSemana: number): string =>
  DIAS_LABELS[diaSemana - 1] ?? `D${diaSemana}`;
