export type ResultadoAuditoria = 'exito' | 'fallo' | 'denegado';

export type AccionAuditoria =
  | 'crear'
  | 'actualizar'
  | 'eliminar'
  | 'consultar'
  | 'exportar'
  | 'login'
  | 'logout'
  | 'otro';

export interface AuditoriaEvento {
  id: number;
  timestamp: string | null;
  usuario_id: string;
  usuario_nombre: string | null;
  rol: string | null;
  modulo: string;
  accion: AccionAuditoria;
  entidad_tipo: string | null;
  entidad_id: string | null;
  metodo_http: string | null;
  ruta: string | null;
  codigo_respuesta: number | null;
  resultado: ResultadoAuditoria;
  direccion_ip: string | null;
  agente_usuario: string | null;
  correlacion_id: string | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  metadatos: Record<string, unknown> | null;
}

export interface AuditoriaEventosPaginados {
  items: AuditoriaEvento[];
  total: number;
  page: number;
  page_size: number;
}

export interface FiltrosAuditoria {
  usuario_id?: string;
  usuario_nombre?: string;
  rol?: string;
  modulo?: string;
  accion?: string;
  entidad_tipo?: string;
  entidad_id?: string;
  metodo_http?: string;
  ruta?: string;
  codigo_respuesta?: number;
  direccion_ip?: string;
  resultado?: ResultadoAuditoria;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  page_size?: number;
}
