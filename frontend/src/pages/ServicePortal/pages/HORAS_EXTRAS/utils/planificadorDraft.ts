import type { EmpleadoERPRead, PlanDiaIn, PlanPreCalculoResponse } from '../../../../../types/horasExtrasPlanificador';

export const PLANIFICADOR_DRAFT_KEY = 'horas_extras_planificador_draft';

export type ResultadoConfirmacion = { ok: number; error: number; he: number; costo: number };

export interface PlanificadorDraft {
  anio: number;
  semanaIso: number;
  seleccionados: string[];
  empleadosInfo: [string, EmpleadoERPRead][];
  overrides: [string, PlanDiaIn[]][];
  diasDestino: number[];
  plantillaEntrada: string;
  plantillaSalida: string;
  plantillaAlmuerzo: number;
  novedadMasiva: string;
  observacionMasiva: string;
  preCalculo: PlanPreCalculoResponse | null;
  resultado: ResultadoConfirmacion | null;
  erroresConfirmacion: [string, string][];
}

const calcularSemanaIsoActual = () => {
  const hoy = new Date();
  const inicioAnio = new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1));
  return Math.ceil(((hoy.getTime() - inicioAnio.getTime()) / 86400000 + inicioAnio.getUTCDay() + 1) / 7);
};

export const crearBorradorPlanificadorBase = (): PlanificadorDraft => ({
  anio: new Date().getUTCFullYear(),
  semanaIso: calcularSemanaIsoActual(),
  seleccionados: [],
  empleadosInfo: [],
  overrides: [],
  diasDestino: [1, 2, 3, 4, 5],
  plantillaEntrada: '07:30',
  plantillaSalida: '17:00',
  plantillaAlmuerzo: 60,
  novedadMasiva: '',
  observacionMasiva: '',
  preCalculo: null,
  resultado: null,
  erroresConfirmacion: [],
});

const esObjeto = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const stringArray = (value: unknown): string[] => {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
};

const numberArray = (value: unknown): number[] => {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : [];
};

const empleadosInfoEntries = (value: unknown): [string, EmpleadoERPRead][] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is [string, EmpleadoERPRead] => {
    return Array.isArray(entry) && typeof entry[0] === 'string' && esObjeto(entry[1]);
  });
};

const overridesEntries = (value: unknown): [string, PlanDiaIn[]][] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is [string, PlanDiaIn[]] => {
    return Array.isArray(entry) && typeof entry[0] === 'string' && Array.isArray(entry[1]);
  });
};

const erroresEntries = (value: unknown): [string, string][] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is [string, string] => {
    return Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'string';
  });
};

export const normalizarBorradorPlanificador = (value: unknown): PlanificadorDraft => {
  const base = crearBorradorPlanificadorBase();
  if (!esObjeto(value)) return base;
  const diasDestino = numberArray(value.diasDestino);

  return {
    anio: typeof value.anio === 'number' ? value.anio : base.anio,
    semanaIso: typeof value.semanaIso === 'number' ? value.semanaIso : base.semanaIso,
    seleccionados: stringArray(value.seleccionados),
    empleadosInfo: empleadosInfoEntries(value.empleadosInfo),
    overrides: overridesEntries(value.overrides),
    diasDestino: diasDestino.length > 0 ? diasDestino : base.diasDestino,
    plantillaEntrada: typeof value.plantillaEntrada === 'string' ? value.plantillaEntrada : base.plantillaEntrada,
    plantillaSalida: typeof value.plantillaSalida === 'string' ? value.plantillaSalida : base.plantillaSalida,
    plantillaAlmuerzo: typeof value.plantillaAlmuerzo === 'number' ? value.plantillaAlmuerzo : base.plantillaAlmuerzo,
    novedadMasiva: typeof value.novedadMasiva === 'string' ? value.novedadMasiva : base.novedadMasiva,
    observacionMasiva: typeof value.observacionMasiva === 'string' ? value.observacionMasiva : base.observacionMasiva,
    preCalculo: esObjeto(value.preCalculo) ? (value.preCalculo as PlanPreCalculoResponse) : null,
    resultado: esObjeto(value.resultado) ? (value.resultado as ResultadoConfirmacion) : null,
    erroresConfirmacion: erroresEntries(value.erroresConfirmacion),
  };
};

export const leerBorradorPlanificador = (): PlanificadorDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY);
    return raw ? normalizarBorradorPlanificador(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export const guardarBorradorPlanificadorLocal = (draft: PlanificadorDraft) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PLANIFICADOR_DRAFT_KEY, JSON.stringify(draft));
};
