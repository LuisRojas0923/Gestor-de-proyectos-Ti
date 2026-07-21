import { API_CONFIG } from '../config/api';
import type { CalculoPlanilla } from '../types/horasExtrasPlanilla';

interface ListarCalculosPlanillaParams {
  cedula?: string;
  anio?: number;
  semana_iso?: number;
  estado?: string;
  limit?: number;
  offset?: number;
}


function buildQuery(params: ListarCalculosPlanillaParams): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const serializada = query.toString();
  return serializada ? `?${serializada}` : '';
}


export async function listarCalculosPlanilla(
  params: ListarCalculosPlanillaParams,
  token: string,
): Promise<CalculoPlanilla[]> {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/novedades-nomina/horas-extras/calculos/planilla${buildQuery(params)}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
  return (await response.json()) as CalculoPlanilla[];
}
