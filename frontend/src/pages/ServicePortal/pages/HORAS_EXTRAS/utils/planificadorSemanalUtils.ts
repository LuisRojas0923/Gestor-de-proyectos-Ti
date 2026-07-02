import type { PlanDiaIn } from '../../../../../types/horasExtrasPlanificador';

export const MAX_SELECCION = 200;
export const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7];
export const CODIGOS_NOVEDAD = ['', 'INC', 'VAC', 'AUS', 'LIC'];
export const OPCIONES_ALMUERZO = [
  { value: '30', label: '00:30' },
  { value: '60', label: '1:00' },
  { value: '90', label: '1:30' },
];

export const DIAS_SEMANA_INICIAL: PlanDiaIn[] = DIAS_SEMANA.map((d) => ({
  dia_semana: d,
  hora_entrada: d <= 5 ? '07:30' : null,
  hora_salida: d <= 5 ? '17:00' : null,
  minutos_almuerzo: d <= 5 ? 60 : 0,
  novedades: [],
  asignaciones_ot: [],
}));

export const normalizarDiasPlan = (dias: PlanDiaIn[]): PlanDiaIn[] =>
  dias.map((dia) => ({
    ...dia,
    asignaciones_ot: dia.asignaciones_ot ?? [],
  }));

export const calcularHorasTurno = (entrada: string | null, salida: string | null, almuerzo: number): number => {
  if (!entrada || !salida) return 0;
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = salida.split(':').map(Number);
  const inicio = eh * 60 + em;
  let fin = sh * 60 + sm;
  if (fin < inicio) fin += 24 * 60;
  return Math.max(0, Number(((fin - inicio - almuerzo) / 60).toFixed(2)));
};
