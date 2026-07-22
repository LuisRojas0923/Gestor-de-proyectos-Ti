/**
 * Cliente HTTP del módulo de Horas Extras y Pre-liquidación.
 *
 * Patrón: funciones puras que reciben `token` y devuelven promesas tipadas.
 * Coincide con el estilo de `auditoriaService.ts` para mantener consistencia.
 *
 * Endpoint base: `${API_CONFIG.BASE_URL}/novedades-nomina/horas-extras`
 */
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import type {
  NovedadCatalogo,
  HorarioPactado,
  HorarioPactadoSemana,
  HorarioPactadoDiaUpdate,
  AutorizacionEfectiva,
  PreLiquidacionInput,
  PreLiquidacionResultado,
  PreLiquidacionConfirmar,
  PreLiquidacionConfirmada,
  CalculoSemanal,
  CostoOt,
  BolsaHoras,
  NivelRiesgoARL,
  WorkflowTransicionRequest,
  WorkflowTransicionResult,
  AutorizarCalculoResult,
  WorkflowEvento,
  CompensarBolsaRequest,
  CompensarBolsaResponse,
  Festivo,
  FestivoSincronizarResult,
  FuenteFestivoQuery,
  NovedadEventoCreate,
  NovedadEventoUpdate,
  NovedadAnularRequest,
  NovedadEventoRead,
  NovedadEventoList,
  BolsaEstadoGlobalOut,
  BolsaOverrideOTIn,
  BolsaOverrideOTOut,
  BolsaGlobalConfigIn,
  ParametrosCalculoResponse,
  ParametrosCalculoUpdateRequest,
  EmpleadoERPDetalle,
} from '../types/horasExtras';
import type {
  EmpleadoERPListResponse,
  OtManoObraListResponse,
  PlanBulkRequest,
  PlanBulkResponse,
  PlanConfirmarRequest,
  PlanConfirmarResponse,
  PlanPreCalculoResponse,
} from '../types/horasExtrasPlanificador';

const BASE = `${API_CONFIG.BASE_URL}/novedades-nomina/horas-extras`;

async function request<T>(
  path: string,
  init: RequestInit & { token: string },
): Promise<T> {
  const { token, headers, ...rest } = init;
  const url = path.startsWith(API_CONFIG.BASE_URL) ? path : `${BASE}${path}`;
  const res = await fetch(url, {
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
// Parámetros editables de cálculo
// ---------------------------------------------------------------------------

export async function obtenerParametrosCalculo(
  token: string,
): Promise<ParametrosCalculoResponse> {
  return request<ParametrosCalculoResponse>('/parametros-calculo', { token });
}

export async function actualizarParametrosCalculo(
  payload: ParametrosCalculoUpdateRequest,
  token: string,
): Promise<ParametrosCalculoResponse> {
  return request<ParametrosCalculoResponse>('/parametros-calculo', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
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

// S5'' — Horario pactado por día (L-D) editable
export async function obtenerHorarioSemana(
  cedula: string,
  token: string,
): Promise<HorarioPactadoSemana> {
  return request<HorarioPactadoSemana>(
    `/horario/${encodeURIComponent(cedula)}/semana`,
    { token },
  );
}

export async function actualizarHorarioSemana(
  cedula: string,
  dias: HorarioPactadoDiaUpdate[],
  token: string,
): Promise<HorarioPactadoSemana> {
  return request<HorarioPactadoSemana>(
    `/horario/${encodeURIComponent(cedula)}/semana`,
    {
      method: 'PUT',
      body: JSON.stringify({ dias }),
      token,
    },
  );
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

export async function obtenerEmpleadoERP(
  identificacion: string,
  token: string,
): Promise<EmpleadoERPDetalle> {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.ERP_EMPLEADO(encodeURIComponent(identificacion))}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
  return (await res.json()) as EmpleadoERPDetalle;
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

// ---------------------------------------------------------------------------
// S4 — Workflow de estados y compensación
// ---------------------------------------------------------------------------

export async function transicionarCalculo(
  calculoId: number,
  payload: WorkflowTransicionRequest,
  token: string,
): Promise<WorkflowTransicionResult> {
  return request<WorkflowTransicionResult>(`/calculos/${calculoId}/transicion`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function autorizarCalculo(
  calculoId: number,
  token: string,
): Promise<AutorizarCalculoResult> {
  return request<AutorizarCalculoResult>(`/calculos/${calculoId}/autorizar`, {
    method: 'POST',
    token,
  });
}

export async function obtenerHistorial(
  calculoId: number,
  token: string,
): Promise<WorkflowEvento[]> {
  return request<WorkflowEvento[]>(`/calculos/${calculoId}/historial`, { token });
}

export async function compensarBolsa(
  payload: CompensarBolsaRequest,
  token: string,
): Promise<CompensarBolsaResponse> {
  return request<CompensarBolsaResponse>('/bolsa/compensar', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

// ---------------------------------------------------------------------------
// S6 — Bolsa desactivable
// ---------------------------------------------------------------------------

export async function obtenerEstadoGlobalBolsa(
  otId: number | null | undefined,
  token: string,
): Promise<BolsaEstadoGlobalOut> {
  const query = otId ? buildQuery({ ot_id: otId }) : '';
  return request<BolsaEstadoGlobalOut>(`/bolsa/estado-global${query}`, { token });
}

export async function configurarBolsaGlobal(
  payload: BolsaGlobalConfigIn,
  token: string,
): Promise<BolsaEstadoGlobalOut> {
  return request<BolsaEstadoGlobalOut>('/admin/bolsa/global', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token,
  });
}

export async function crearOverrideBolsaOT(
  payload: BolsaOverrideOTIn,
  token: string,
): Promise<BolsaOverrideOTOut> {
  return request<BolsaOverrideOTOut>('/bolsa/overrides-ot', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function revocarOverrideBolsaOT(
  overrideId: number,
  token: string,
): Promise<void> {
  await request<void>(`/bolsa/overrides-ot/${overrideId}`, {
    method: 'DELETE',
    token,
  });
}

// ---------------------------------------------------------------------------
// S5' — Festivos
// ---------------------------------------------------------------------------

export async function listarFestivos(
  anio: number,
  fuente: FuenteFestivoQuery,
  token: string,
): Promise<Festivo[]> {
  return request<Festivo[]>(`/festivos/${anio}${buildQuery({ fuente })}`, { token });
}

export async function sincronizarFestivos(
  anio: number,
  token: string,
): Promise<FestivoSincronizarResult> {
  return request<FestivoSincronizarResult>(`/festivos/${anio}/sincronizar`, {
    method: 'POST',
    token,
  });
}

// ---------------------------------------------------------------------------
// S5 — Eventos de novedades
// ---------------------------------------------------------------------------

export interface ListarNovedadesParams {
  cedula?: string;
  codigo?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: string;
  limit?: number;
  offset?: number;
}

export async function listarNovedades(
  params: ListarNovedadesParams,
  token: string,
): Promise<NovedadEventoList> {
  return request<NovedadEventoList>(`/novedades${buildQuery(params)}`, { token });
}

export async function crearNovedad(
  payload: NovedadEventoCreate,
  token: string,
): Promise<NovedadEventoRead> {
  return request<NovedadEventoRead>('/novedades', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function obtenerNovedad(
  novedadId: number,
  token: string,
): Promise<NovedadEventoRead> {
  return request<NovedadEventoRead>(`/novedades/${novedadId}`, { token });
}

export async function actualizarNovedad(
  novedadId: number,
  payload: NovedadEventoUpdate,
  token: string,
): Promise<NovedadEventoRead> {
  return request<NovedadEventoRead>(`/novedades/${novedadId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
}

export async function confirmarNovedad(
  novedadId: number,
  token: string,
): Promise<NovedadEventoRead> {
  return request<NovedadEventoRead>(`/novedades/${novedadId}/confirmar`, {
    method: 'POST',
    token,
  });
}

export async function anularNovedad(
  novedadId: number,
  payload: NovedadAnularRequest,
  token: string,
): Promise<NovedadEventoRead> {
  return request<NovedadEventoRead>(`/novedades/${novedadId}/anular`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

// ---------------------------------------------------------------------------
// S7 — Planificador semanal masivo
// ---------------------------------------------------------------------------

export async function buscarEmpleadosERP(
  query: string | undefined,
  limit: number,
  offset: number,
  token: string,
  soloActivos: boolean = true,
  anio?: number,
  semanaIso?: number,
): Promise<EmpleadoERPListResponse> {
  const qs = buildQuery({
    q: query,
    limit,
    offset,
    solo_activos: soloActivos,
    anio,
    semana_iso: semanaIso,
  });
  return request<EmpleadoERPListResponse>(`/planificador/empleados-erp${qs}`, {
    method: 'GET',
    token,
  });
}

export async function buscarOtManoObra(
  query: string | undefined,
  limit: number,
  offset: number,
  token: string,
): Promise<OtManoObraListResponse> {
  const qs = buildQuery({ q: query, limit, offset });
  return request<OtManoObraListResponse>(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.PLANIFICADOR_OTS_HORARIOS}${qs}`, {
    method: 'GET',
    token,
  });
}

export async function guardarBorradorPlan(
  payload: PlanBulkRequest,
  token: string,
): Promise<PlanBulkResponse> {
  return request<PlanBulkResponse>('/horario/registros/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function preCalcularPlan(
  payload: PlanBulkRequest,
  token: string,
): Promise<PlanPreCalculoResponse> {
  return request<PlanPreCalculoResponse>('/planificador/pre-calcular', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function confirmarPlan(
  payload: PlanConfirmarRequest,
  token: string,
): Promise<PlanConfirmarResponse> {
  return request<PlanConfirmarResponse>('/planificador/confirmar', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

// Re-export del tipo de nivel ARL para conveniencia de consumidores.
export type { NivelRiesgoARL };
