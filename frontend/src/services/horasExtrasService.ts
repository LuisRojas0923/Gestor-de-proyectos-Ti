/**
 * Cliente HTTP del módulo de Horas Extras y Pre-liquidación.
 *
 * Patrón: funciones puras que reciben `token` y devuelven promesas tipadas.
 * Coincide con el estilo de `auditoriaService.ts` para mantener consistencia.
 *
 * Endpoint base: `${API_CONFIG.BASE_URL}/novedades-nomina/horas-extras`
 */
import { API_CONFIG } from '../config/api';
import type {
  NovedadCatalogo,
  HorarioPactado,
  AutorizacionEfectiva,
  PreLiquidacionInput,
  PreLiquidacionResultado,
  PreLiquidacionConfirmar,
  PreLiquidacionConfirmada,
  CalculoSemanal,
  CostoOt,
  BolsaHoras,
  NivelRiesgoARL,
} from '../types/horasExtras';

const BASE = `${API_CONFIG.BASE_URL}/novedades-nomina/horas-extras`;

async function request<T>(
  path: string,
  init: RequestInit & { token: string },
): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.detail || text;
    } catch {
      /* detail = text */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export interface ListarCatalogoParams {
  categoria?: string;
  solo_acreditan_bolsa?: boolean;
  fecha?: string;
}

export async function listarCatalogo(
  params: ListarCatalogoParams,
  token: string,
): Promise<NovedadCatalogo[]> {
  return request<NovedadCatalogo[]>(`/catalogo${buildQuery(params)}`, { token });
}

// ---------------------------------------------------------------------------
// Horario y autorización
// ---------------------------------------------------------------------------

export async function obtenerHorario(
  cedula: string,
  token: string,
): Promise<HorarioPactado | null> {
  return request<HorarioPactado | null>(`/horario/${encodeURIComponent(cedula)}`, { token });
}

export async function obtenerAutorizacionEfectiva(
  cedula: string,
  token: string,
): Promise<AutorizacionEfectiva> {
  return request<AutorizacionEfectiva>(`/autorizacion/${encodeURIComponent(cedula)}`, {
    token,
  });
}

// ---------------------------------------------------------------------------
// Pre-liquidación
// ---------------------------------------------------------------------------

export async function ejecutarPreLiquidacion(
  input: PreLiquidacionInput,
  token: string,
): Promise<PreLiquidacionResultado> {
  return request<PreLiquidacionResultado>('/pre-liquidacion', {
    method: 'POST',
    body: JSON.stringify(input),
    token,
  });
}

export async function confirmarPreLiquidacion(
  payload: PreLiquidacionConfirmar,
  token: string,
): Promise<PreLiquidacionConfirmada> {
  return request<PreLiquidacionConfirmada>('/pre-liquidacion/confirmar', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

// ---------------------------------------------------------------------------
// Bolsa de horas
// ---------------------------------------------------------------------------

export async function obtenerBolsa(
  cedula: string,
  token: string,
): Promise<BolsaHoras> {
  return request<BolsaHoras>(`/bolsa/${encodeURIComponent(cedula)}`, { token });
}

// ---------------------------------------------------------------------------
// Cálculos (lectura)
// ---------------------------------------------------------------------------

export interface ListarCalculosParams {
  cedula?: string;
  anio?: number;
  semana_iso?: number;
  estado?: string;
  limit?: number;
  offset?: number;
}

export async function listarCalculos(
  params: ListarCalculosParams,
  token: string,
): Promise<CalculoSemanal[]> {
  return request<CalculoSemanal[]>(`/calculos${buildQuery(params)}`, { token });
}

export async function obtenerCalculo(
  calculoId: number,
  token: string,
): Promise<CalculoSemanal> {
  return request<CalculoSemanal>(`/calculos/${calculoId}`, { token });
}

// ---------------------------------------------------------------------------
// Costos OT
// ---------------------------------------------------------------------------

export interface ListarCostosOtParams {
  ot_id?: number;
  ot_codigo?: string;
  anio?: number;
  semana_iso?: number;
  limit?: number;
}

export async function listarCostosOt(
  params: ListarCostosOtParams,
  token: string,
): Promise<CostoOt[]> {
  return request<CostoOt[]>(`/costos-ot${buildQuery(params)}`, { token });
}

// Re-export del tipo de nivel ARL para conveniencia de consumidores.
export type { NivelRiesgoARL };
