import type { EmpleadoERPRead, PlanDiaIn, PlanPreCalculoResponse } from '../../../../../types/horasExtrasPlanificador';

export const PLANIFICADOR_DRAFT_KEY = 'horas_extras_planificador_draft';
const ALMUERZO_DEFAULT_MINUTOS = 30;
const ALMUERZO_DEFAULT_ANTERIOR_MINUTOS = 60;

export type ResultadoConfirmacion = { ok: number; error: number; he: number; hf: number; costo: number };

export interface PlanificadorDraft {
  usuario: string | null;
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
  usuario: typeof window === 'undefined' ? null : localStorage.getItem('user_cedula'),
  anio: new Date().getUTCFullYear(),
  semanaIso: calcularSemanaIsoActual(),
  seleccionados: [],
  empleadosInfo: [],
  overrides: [],
  diasDestino: [1, 2, 3, 4, 5],
  plantillaEntrada: '07:30',
  plantillaSalida: '17:00',
  plantillaAlmuerzo: ALMUERZO_DEFAULT_MINUTOS,
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
  return value
    .filter((entry): entry is [string, PlanDiaIn[]] => {
      return Array.isArray(entry) && typeof entry[0] === 'string' && Array.isArray(entry[1]);
    })
    .map(([cedula, dias]) => [
      cedula,
      dias.map((dia) => ({
        ...dia,
        minutos_almuerzo: dia.minutos_almuerzo === ALMUERZO_DEFAULT_ANTERIOR_MINUTOS
          ? ALMUERZO_DEFAULT_MINUTOS
          : dia.minutos_almuerzo,
      })),
    ]);
};

const erroresEntries = (value: unknown): [string, string][] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is [string, string] => {
    return Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'string';
  });
};

const normalizarPreCalculo = (value: unknown): PlanPreCalculoResponse | null => {
  if (!esObjeto(value) || !Array.isArray(value.empleados) || !esObjeto(value.resumen)) return null;
  const response = value as unknown as PlanPreCalculoResponse;
  const empleados = response.empleados.filter(esObjeto).map((empleado) => {
    const detalle = Array.isArray(empleado.detalle_por_dia) ? empleado.detalle_por_dia : [];
    const detalleNormalizado = detalle.filter(esObjeto).map((dia) => ({
      ...dia,
      conceptos: Array.isArray(dia.conceptos)
        ? dia.conceptos
        : dia.codigo_he
          ? [{
              codigo: dia.codigo_he,
              horas: dia.codigo_he === 'HF' ? dia.horas_ordinarias : dia.horas_extras,
              costo_estimado: dia.costo_estimado ?? 0,
            }]
          : [],
    }));
    const totalFestivas = typeof empleado.total_horas_festivas === 'number'
      ? empleado.total_horas_festivas
      : detalleNormalizado.reduce((total, dia) => (
          total + dia.conceptos
            .filter((concepto) => concepto.codigo === 'HF')
            .reduce((subtotal, concepto) => subtotal + concepto.horas, 0)
        ), 0);
    return { ...empleado, detalle_por_dia: detalleNormalizado, total_horas_festivas: totalFestivas };
  });
  return {
    ...response,
    empleados,
    resumen: {
      ...response.resumen,
      total_horas_festivas: typeof response.resumen.total_horas_festivas === 'number'
        ? response.resumen.total_horas_festivas
        : empleados.reduce((total, empleado) => total + empleado.total_horas_festivas, 0),
    },
  };
};

export const normalizarBorradorPlanificador = (value: unknown): PlanificadorDraft => {
  const base = crearBorradorPlanificadorBase();
  if (!esObjeto(value)) return base;
  const diasDestino = numberArray(value.diasDestino);

  return {
    usuario: typeof value.usuario === 'string' ? value.usuario : null,
    anio: typeof value.anio === 'number' ? value.anio : base.anio,
    semanaIso: typeof value.semanaIso === 'number' ? value.semanaIso : base.semanaIso,
    seleccionados: stringArray(value.seleccionados),
    empleadosInfo: empleadosInfoEntries(value.empleadosInfo),
    overrides: overridesEntries(value.overrides),
    diasDestino: diasDestino.length > 0 ? diasDestino : base.diasDestino,
    plantillaEntrada: typeof value.plantillaEntrada === 'string' ? value.plantillaEntrada : base.plantillaEntrada,
    plantillaSalida: typeof value.plantillaSalida === 'string' ? value.plantillaSalida : base.plantillaSalida,
    plantillaAlmuerzo: value.plantillaAlmuerzo === ALMUERZO_DEFAULT_ANTERIOR_MINUTOS
      ? ALMUERZO_DEFAULT_MINUTOS
      : typeof value.plantillaAlmuerzo === 'number' ? value.plantillaAlmuerzo : base.plantillaAlmuerzo,
    novedadMasiva: typeof value.novedadMasiva === 'string' ? value.novedadMasiva : base.novedadMasiva,
    observacionMasiva: typeof value.observacionMasiva === 'string' ? value.observacionMasiva : base.observacionMasiva,
    preCalculo: normalizarPreCalculo(value.preCalculo),
    resultado: esObjeto(value.resultado) ? {
      ...(value.resultado as Omit<ResultadoConfirmacion, 'hf'>),
      hf: typeof value.resultado.hf === 'number' ? value.resultado.hf : 0,
    } : null,
    erroresConfirmacion: erroresEntries(value.erroresConfirmacion),
  };
};

export const leerBorradorPlanificador = (): PlanificadorDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY);
    if (!raw) return null;
    const draft = normalizarBorradorPlanificador(JSON.parse(raw));
    const usuarioActual = localStorage.getItem('user_cedula');
    if (draft.usuario !== usuarioActual) {
      window.sessionStorage.removeItem(PLANIFICADOR_DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
};

export const guardarBorradorPlanificadorLocal = (draft: PlanificadorDraft) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PLANIFICADOR_DRAFT_KEY, JSON.stringify(draft));
};
