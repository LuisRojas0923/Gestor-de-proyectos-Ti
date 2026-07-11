import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import type {
  AplicarPlantillaInput,
  AplicarPlantillaResultado,
  AsistenciaBiometriaAdmin,
  CambioRelacionesInput,
  CambioRelacionesResultado,
  CapacidadesBiometria,
  FiltrosEmpleadosErp,
  FiltrosAsistenciasBiometria,
  GestorAlcance,
  ListarPlantillasParams,
  Pagina,
  PaginaEmpleadosErp,
  PlantillaHorario,
  PlantillaHorarioInput,
  PlantillaHorarioUpdate,
} from '../types/horariosRelaciones';

export class ApiHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

const tokenActual = (): string => localStorage.getItem('token') || '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenActual()}`,
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: unknown } | null;
    const detail = typeof body?.detail === 'string' ? body.detail : undefined;
    const message = response.status === 403
      ? detail || 'No tienes permiso para realizar esta operación.'
      : detail || `HTTP ${response.status}`;
    throw new ApiHttpError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const querySimple = (params: object): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : '';
};

export const serializarFiltrosEmpleados = (params: FiltrosEmpleadosErp): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else query.set(key, String(value));
  });
  return `?${query.toString()}`;
};

export const listarPlantillas = (params: ListarPlantillasParams, signal?: AbortSignal) =>
  request<Pagina<PlantillaHorario>>(`${API_ENDPOINTS.PLANTILLAS_HORARIO}${querySimple(params)}`, { signal });

export const crearPlantilla = (payload: PlantillaHorarioInput) =>
  request<PlantillaHorario>(API_ENDPOINTS.PLANTILLAS_HORARIO, { method: 'POST', body: JSON.stringify(payload) });

export const actualizarPlantilla = (id: string, payload: PlantillaHorarioUpdate) =>
  request<PlantillaHorario>(API_ENDPOINTS.PLANTILLA_HORARIO(encodeURIComponent(id)), { method: 'PATCH', body: JSON.stringify(payload) });

export const desactivarPlantilla = (id: string) =>
  request<PlantillaHorario>(API_ENDPOINTS.PLANTILLA_HORARIO_DESACTIVAR(encodeURIComponent(id)), { method: 'POST' });

export const duplicarPlantilla = (id: string, nombre: string) =>
  request<PlantillaHorario>(API_ENDPOINTS.PLANTILLA_HORARIO_DUPLICAR(encodeURIComponent(id)), { method: 'POST', body: JSON.stringify({ nombre }) });

export const aplicarPlantilla = (id: string, payload: AplicarPlantillaInput) =>
  request<AplicarPlantillaResultado>(API_ENDPOINTS.PLANTILLA_HORARIO_APLICACIONES(encodeURIComponent(id)), { method: 'POST', body: JSON.stringify(payload) });

export const listarGestores = (q = '', signal?: AbortSignal) =>
  request<Pagina<GestorAlcance>>(`${API_ENDPOINTS.ALCANCE_GESTORES}${querySimple({ q, limit: 100, offset: 0 })}`, { signal });

export const listarEmpleadosGestor = (gestorId: string, params: FiltrosEmpleadosErp, signal?: AbortSignal) =>
  request<PaginaEmpleadosErp>(`${API_ENDPOINTS.ALCANCE_GESTOR_EMPLEADOS(encodeURIComponent(gestorId))}${serializarFiltrosEmpleados(params)}`, { signal });

export const listarEmpleadosOperativos = (params: FiltrosEmpleadosErp, signal?: AbortSignal) =>
  request<PaginaEmpleadosErp>(`${API_ENDPOINTS.PLANIFICADOR_EMPLEADOS_ERP}${serializarFiltrosEmpleados(params)}`, { signal });

export const guardarRelaciones = (gestorId: string, payload: CambioRelacionesInput) =>
  request<CambioRelacionesResultado>(API_ENDPOINTS.ALCANCE_GESTOR_RELACIONES(encodeURIComponent(gestorId)), { method: 'PUT', body: JSON.stringify(payload) });

export const obtenerCapacidadesBiometria = (signal?: AbortSignal) =>
  request<CapacidadesBiometria>(API_ENDPOINTS.BIOMETRIA_CAPACIDADES, { signal });

export const listarAsistenciasBiometria = (params: FiltrosAsistenciasBiometria, signal?: AbortSignal) =>
  request<Pagina<AsistenciaBiometriaAdmin>>(`${API_ENDPOINTS.BIOMETRIA_ADMIN_ASISTENCIAS}${querySimple(params)}`, { signal });

export const obtenerEvidenciaBiometria = async (registroId: number, signal?: AbortSignal): Promise<Blob> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ADMIN_EVIDENCIA(registroId)}`,
    { signal, headers: { Authorization: `Bearer ${tokenActual()}` } },
  );
  if (!response.ok) throw new ApiHttpError(response.status, response.status === 403 ? 'No tienes permiso para consultar esta evidencia.' : `HTTP ${response.status}`);
  return response.blob();
};
