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

export interface StatsPorModulo {
  modulo: string;
  total: number;
  usuarios_unicos?: number;
  ultimos_eventos?: AuditoriaEventoResumen[];
}

export type AuditoriaEventoResumen = Pick<
  AuditoriaEvento,
  'id' | 'timestamp' | 'usuario_id' | 'usuario_nombre' | 'modulo' | 'accion' | 'resultado' | 'metodo_http' | 'ruta' | 'datos_nuevos' | 'metadatos'
>;

export interface TipoFallo {
  tipo: string;
  total: number;
  detalles?: Record<string, number>;
}

export interface StatsPorDia {
  fecha: string;
  total: number;
}

export interface TopUsuario {
  usuario_nombre: string | null;
  usuario_id: string;
  total: number;
  ultimo_evento: string | null;
}

export interface TopRuta {
  ruta: string;
  accion: string;
  total: number;
  fallos: number;
  ruta_amigable?: string;
}

export interface StatsPorHora {
  rango: string;
  total: number;
}

export interface StatsPorDispositivo {
  dispositivo: string;
  total: number;
}

export interface AuditoriaEstadisticas {
  total_eventos: number;
  usuarios_unicos: number;
  total_exitosos: number;
  total_fallidos: number;
  total_denegados: number;
  total_fallos_auth: number;
  tasa_exito: number;
  modulo_mas_activo: string | null;
  por_modulo: StatsPorModulo[];
  tipos_fallos: TipoFallo[];
  por_dia: StatsPorDia[];
  top_usuarios: TopUsuario[];
  top_rutas: TopRuta[];
  por_hora?: StatsPorHora[];
  por_dispositivo?: StatsPorDispositivo[];
}
