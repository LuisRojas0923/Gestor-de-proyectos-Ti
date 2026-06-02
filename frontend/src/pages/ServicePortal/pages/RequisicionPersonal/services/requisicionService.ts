// Servicio de API para el módulo Requisición de Personal (RP)
import axios from 'axios';
import { API_CONFIG } from '../../../../../config/api';
import type {
  RequisicionRP, AreaRP, CargoRP, CiudadRP, AprobadorRP, DashboardRP, FormularioRP,
  EmpresaTemporal, RequisicionTemporal, CandidatoRequisicion, SeguimientoStats
} from '../types/requisicion.types';

const BASE = `${API_CONFIG.BASE_URL}/rrhh`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// ── Catálogos ──────────────────────────────────
export const getAreas = (solo_activas = true): Promise<AreaRP[]> =>
  axios.get(`${BASE}/catalogos/areas?solo_activas=${solo_activas}`, authHeaders()).then(r => r.data);

export const getCargos = (area_id?: number | null, solo_activos = true): Promise<CargoRP[]> => {
  const query = new URLSearchParams();
  if (area_id !== undefined && area_id !== null) {
    query.append('area_id', String(area_id));
  }
  query.append('solo_activos', String(solo_activos));
  return axios.get(`${BASE}/catalogos/cargos?${query.toString()}`, authHeaders()).then(r => r.data);
};

export const crearArea = (nombre: string): Promise<AreaRP> =>
  axios.post(`${BASE}/catalogos/areas?nombre=${encodeURIComponent(nombre)}`, {}, authHeaders()).then(r => r.data);

export const actualizarArea = (id: number, nombre: string, activo: boolean): Promise<AreaRP> =>
  axios.put(`${BASE}/catalogos/areas/${id}?nombre=${encodeURIComponent(nombre)}&activo=${activo}`, {}, authHeaders()).then(r => r.data);

export const crearCargo = (area_id: number, nombre: string, cargo_superior_id?: number | null): Promise<CargoRP> => {
  const query = new URLSearchParams({ area_id: String(area_id), nombre });
  if (cargo_superior_id !== undefined && cargo_superior_id !== null) {
    query.append('cargo_superior_id', String(cargo_superior_id));
  }
  return axios.post(`${BASE}/catalogos/cargos?${query.toString()}`, {}, authHeaders()).then(r => r.data);
};

export const actualizarCargo = (
  id: number,
  payload: { nombre?: string; activo?: boolean; cargo_superior_id?: number | null }
): Promise<CargoRP> => {
  const query = new URLSearchParams();
  if (payload.nombre !== undefined) query.append('nombre', payload.nombre);
  if (payload.activo !== undefined) query.append('activo', String(payload.activo));
  if (payload.cargo_superior_id !== undefined) {
    // Si cargo_superior_id es null, mandamos 0 para limpiarlo
    query.append('cargo_superior_id', payload.cargo_superior_id !== null ? String(payload.cargo_superior_id) : '0');
  }
  return axios.put(`${BASE}/catalogos/cargos/${id}?${query.toString()}`, {}, authHeaders()).then(r => r.data);
};

export const sincronizarJerarquia = (): Promise<{ detail: string }> =>
  axios.post(`${BASE}/catalogos/sincronizar-jerarquia`, {}, authHeaders()).then(r => r.data);



export const getAprobadores = (): Promise<AprobadorRP[]> =>
  axios.get(`${BASE}/catalogos/aprobadores`, authHeaders()).then(r => r.data);

export const crearAprobador = (payload: Omit<AprobadorRP, 'id'>): Promise<AprobadorRP> =>
  axios.post(`${BASE}/catalogos/aprobadores`, payload, authHeaders()).then(r => r.data);

export const actualizarAprobador = (id: number, payload: Omit<AprobadorRP, 'id'>): Promise<AprobadorRP> =>
  axios.put(`${BASE}/catalogos/aprobadores/${id}`, payload, authHeaders()).then(r => r.data);

export const desactivarAprobador = (id: number): Promise<void> =>
  axios.delete(`${BASE}/catalogos/aprobadores/${id}`, authHeaders()).then(r => r.data);

// ── Dashboard ──────────────────────────────────
export const getDashboard = (correo?: string): Promise<DashboardRP> => {
  const query = correo ? `?correo_solicitante=${encodeURIComponent(correo)}` : '';
  return axios.get(`${BASE}/requisiciones/dashboard${query}`, authHeaders()).then(r => r.data);
};

// ── Mis Requisiciones ─────────────────────────
export const getMisRequisiciones = (correo: string): Promise<RequisicionRP[]> =>
  axios.get(`${BASE}/requisiciones/mis-requisiciones?correo_solicitante=${encodeURIComponent(correo)}`, authHeaders()).then(r => r.data);

// ── Detalle ─────────────────────────────────────
export const getDetalleRequisicion = (id: number): Promise<RequisicionRP> =>
  axios.get(`${BASE}/requisiciones/${id}`, authHeaders()).then(r => r.data);

// ── Guardar Borrador ──────────────────────────
export const guardarBorrador = (
  form: Partial<FormularioRP>,
  correo: string,
  nombre: string,
  requisicion_id?: number
): Promise<RequisicionRP> => {
  const params = new URLSearchParams({
    correo_solicitante: correo,
    nombre_solicitante: nombre,
    ...(requisicion_id ? { requisicion_id: String(requisicion_id) } : {}),
  });
  return axios.post(`${BASE}/requisiciones/borrador?${params}`, form, authHeaders()).then(r => r.data);
};

// ── Enviar a Aprobación ────────────────────────
export const enviarAAprobacion = (
  id: number, correo: string, nombre: string
): Promise<RequisicionRP> => {
  const params = new URLSearchParams({ correo_solicitante: correo, nombre_solicitante: nombre });
  return axios.post(`${BASE}/requisiciones/${id}/enviar?${params}`, {}, authHeaders()).then(r => r.data);
};

// ── Editar ─────────────────────────────────────
export const editarRequisicion = (
  id: number, form: Partial<FormularioRP>, correo: string, nombre: string
): Promise<RequisicionRP> => {
  const params = new URLSearchParams({ correo_solicitante: correo, nombre_solicitante: nombre });
  return axios.put(`${BASE}/requisiciones/${id}?${params}`, form, authHeaders()).then(r => r.data);
};

// ── Cancelar (solicitante, solo BORRADOR) ──────
export const cancelarRequisicion = (id: number, correo: string, nombre: string): Promise<RequisicionRP> => {
  const params = new URLSearchParams({ correo_solicitante: correo, nombre_solicitante: nombre });
  return axios.post(`${BASE}/requisiciones/${id}/cancelar?${params}`, {}, authHeaders()).then(r => r.data);
};

// ── Bandeja Aprobador ─────────────────────────
export const getBandejaAprobador = (correo: string): Promise<RequisicionRP[]> =>
  axios.get(`${BASE}/requisiciones/bandeja-aprobador?aprobador_email=${encodeURIComponent(correo)}`, authHeaders()).then(r => r.data);

export const aprobarRequisicion = (id: number, observacion?: string): Promise<RequisicionRP> =>
  axios.post(`${BASE}/requisiciones/${id}/aprobar`, { observacion }, authHeaders()).then(r => r.data);

export const rechazarRequisicion = (id: number, observacion: string): Promise<RequisicionRP> =>
  axios.post(`${BASE}/requisiciones/${id}/rechazar`, { observacion }, authHeaders()).then(r => r.data);

export const devolverRequisicion = (id: number, observacion: string): Promise<RequisicionRP> =>
  axios.post(`${BASE}/requisiciones/${id}/devolver`, { observacion }, authHeaders()).then(r => r.data);

// ── Bandeja GH ────────────────────────────────
export const getBandejaGH = (): Promise<RequisicionRP[]> =>
  axios.get(`${BASE}/requisiciones/bandeja-gestion-humana`, authHeaders()).then(r => r.data);

/** Cancela una RP desde Gestión Humana con observación obligatoria. Solo válido desde APROBADA o EN_PROCESO_SELECCION. */
export const cancelarRequisicionGH = (id: number, observacion: string): Promise<RequisicionRP> =>
  axios.post(`${BASE}/requisiciones/${id}/cancelar-gh`, { observacion }, authHeaders()).then(r => r.data);


// ── Bandeja Gerente ───────────────────────────
export const getBandejaGerente = (): Promise<RequisicionRP[]> =>
  axios.get(`${BASE}/requisiciones/bandeja-gerente`, authHeaders()).then(r => r.data);

export const aprobarGerente = (id: number, observacion?: string): Promise<RequisicionRP> =>
  axios.post(`${BASE}/requisiciones/${id}/aprobar-gerente`, { observacion }, authHeaders()).then(r => r.data);

export const rechazarGerente = (id: number, observacion: string): Promise<RequisicionRP> =>
  axios.post(`${BASE}/requisiciones/${id}/rechazar-gerente`, { observacion }, authHeaders()).then(r => r.data);

export const devolverGerente = (id: number, observacion: string): Promise<RequisicionRP> =>
  axios.post(`${BASE}/requisiciones/${id}/devolver-gerente`, { observacion }, authHeaders()).then(r => r.data);

// ── Comentarios ──────────────────────────────
export const agregarComentario = (
  id: number, comentario: string, usuario_nombre: string, usuario_email: string
): Promise<void> => {
  const params = new URLSearchParams({ usuario_nombre, usuario_email });
  return axios.post(`${BASE}/requisiciones/${id}/comentarios?${params}`, { comentario }, authHeaders()).then(r => r.data);
};

// ── Catálogo de Temporales ─────────────────────
export const getTemporales = (): Promise<EmpresaTemporal[]> =>
  axios.get(`${BASE}/requisiciones/temporales`, authHeaders()).then(r => r.data);

export const crearTemporal = (nombre: string): Promise<EmpresaTemporal> =>
  axios.post(`${BASE}/requisiciones/temporales`, { nombre }, authHeaders()).then(r => r.data);

export const actualizarTemporal = (id: number, nombre: string, activo: boolean): Promise<EmpresaTemporal> =>
  axios.put(`${BASE}/requisiciones/temporales/${id}`, { nombre, activo }, authHeaders()).then(r => r.data);

export const eliminarTemporal = (id: number): Promise<void> =>
  axios.delete(`${BASE}/requisiciones/temporales/${id}`, authHeaders()).then(() => {});

// ── Asignación a Temporales ────────────────────
export const getRequisicionTemporales = (requisicionId: number): Promise<RequisicionTemporal[]> =>
  axios.get(`${BASE}/requisiciones/${requisicionId}/temporales`, authHeaders()).then(r => r.data);

export const asignarRequisicionTemporales = (requisicionId: number, temporalIds: number[]): Promise<RequisicionTemporal[]> =>
  axios.post(`${BASE}/requisiciones/${requisicionId}/temporales`, { temporal_ids: temporalIds }, authHeaders()).then(r => r.data);

export const actualizarFechaEnvioHV = (requisicionId: number, temporalId: number, fechaEnvioHV: string | null): Promise<RequisicionTemporal> =>
  axios.put(`${BASE}/requisiciones/${requisicionId}/temporales/${temporalId}/envio-hv`, { fecha_envio_hv: fechaEnvioHV }, authHeaders()).then(r => r.data);

// ── Pipeline de Candidatos ─────────────────────
export const getCandidatos = (requisicionId: number): Promise<CandidatoRequisicion[]> =>
  axios.get(`${BASE}/requisiciones/${requisicionId}/candidatos`, authHeaders()).then(r => r.data);

export const agregarCandidato = (requisicionId: number, temporalId: number, nombreCandidato: string, observaciones?: string): Promise<CandidatoRequisicion> =>
  axios.post(`${BASE}/requisiciones/${requisicionId}/candidatos`, { temporal_id: temporalId, nombre_candidato: nombreCandidato, observaciones }, authHeaders()).then(r => r.data);

export const actualizarCandidato = (candidatoId: number, fields: Partial<CandidatoRequisicion>): Promise<CandidatoRequisicion> =>
  axios.put(`${BASE}/requisiciones/candidatos/${candidatoId}`, fields, authHeaders()).then(r => r.data);

// ── Métricas de Seguimiento ────────────────────
export const getSeguimientoStats = (requisicionId: number): Promise<SeguimientoStats> =>
  axios.get(`${BASE}/requisiciones/${requisicionId}/seguimiento-stats`, authHeaders()).then(r => r.data);
