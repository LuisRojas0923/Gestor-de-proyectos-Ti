import type { NivelRiesgoARL, RegistroDiario } from '../../../../../types/horasExtras';

export const CODIGOS_NOVEDAD_SUPRESION = ['VAC', 'LIC', 'INC', 'AUS'] as const;

export const HORAS_ORDINARIAS_DIARIAS = 8;

export const NIVELES: { value: NivelRiesgoARL; label: string }[] = [
  { value: 'I', label: 'Nivel I - Dirección' },
  { value: 'II', label: 'Nivel II - Administrativo' },
  { value: 'III', label: 'Nivel III - Operativo' },
  { value: 'IV', label: 'Nivel IV - Operativo alto' },
  { value: 'V', label: 'Nivel V - Riesgo máximo' },
];

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

export const getCurrentWeek = (): { anio: number; semana: number } => {
  const now = new Date();
  const target = new Date(now.valueOf());
  const dayNr = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { anio: now.getFullYear(), semana: week };
};

export const registroVacio = (): RegistroDiario[] =>
  Array.from({ length: 7 }, (_, i) => ({
    dia_semana: i + 1,
    hora_entrada: null,
    hora_salida: null,
    minutos_almuerzo: 0,
    cruza_medianoche: false,
  }));
