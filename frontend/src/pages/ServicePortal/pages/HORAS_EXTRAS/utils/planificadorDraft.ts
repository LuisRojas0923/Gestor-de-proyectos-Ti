import type { EmpleadoERPRead, PlanDiaIn, PlanPreCalculoResponse } from '../../../../../types/horasExtras';

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

export const leerBorradorPlanificador = (): PlanificadorDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PLANIFICADOR_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as PlanificadorDraft) : null;
  } catch {
    return null;
  }
};
