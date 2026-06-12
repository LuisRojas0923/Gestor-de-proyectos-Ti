import { API_CONFIG } from '../config/api';
import type { AuditoriaEvento, AuditoriaEventosPaginados, FiltrosAuditoria } from '../types/auditoria';

const BASE = `${API_CONFIG.BASE_URL}/auditoria`;

function buildQuery(filtros: FiltrosAuditoria): string {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function listarEventosAuditoria(
  filtros: FiltrosAuditoria,
  token: string
): Promise<AuditoriaEventosPaginados> {
  const response = await fetch(`${BASE}/eventos${buildQuery(filtros)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('No se pudo cargar la auditoría');
  }
  return response.json();
}

export async function obtenerEventoAuditoria(
  eventoId: number,
  token: string
): Promise<AuditoriaEvento> {
  const response = await fetch(`${BASE}/eventos/${eventoId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Evento de auditoría no encontrado');
  }
  return response.json();
}
