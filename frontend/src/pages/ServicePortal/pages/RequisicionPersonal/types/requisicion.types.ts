// Tipos TypeScript del módulo Requisición de Personal (RP)

export type EstadoRP =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'PENDIENTE_APROBACION_GERENCIA'
  | 'DEVUELTA_AJUSTE'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'EN_PROCESO_SELECCION'
  | 'CERRADA'
  | 'CANCELADA';

export const ESTADO_LABELS: Record<EstadoRP, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_APROBACION: 'Pendiente de Aprobación',
  PENDIENTE_APROBACION_GERENCIA: 'Pendiente Aprobación Gerencia',
  DEVUELTA_AJUSTE: 'Devuelta para Ajuste',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  EN_PROCESO_SELECCION: 'En Proceso de Selección',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

export const ESTADO_COLORES: Record<EstadoRP, { bg: string; text: string; dot: string }> = {
  BORRADOR:               { bg: 'bg-slate-100',   text: 'text-slate-700',  dot: 'bg-slate-400'  },
  PENDIENTE_APROBACION:   { bg: 'bg-amber-50',    text: 'text-amber-800',  dot: 'bg-amber-400'  },
  PENDIENTE_APROBACION_GERENCIA: { bg: 'bg-indigo-50', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  DEVUELTA_AJUSTE:        { bg: 'bg-orange-50',   text: 'text-orange-800', dot: 'bg-orange-500' },
  APROBADA:               { bg: 'bg-emerald-50',  text: 'text-emerald-800',dot: 'bg-emerald-500'},
  RECHAZADA:              { bg: 'bg-red-50',      text: 'text-red-800',    dot: 'bg-red-500'    },
  EN_PROCESO_SELECCION:   { bg: 'bg-blue-50',     text: 'text-blue-800',   dot: 'bg-blue-500'   },
  CERRADA:                { bg: 'bg-gray-100',    text: 'text-gray-600',   dot: 'bg-gray-400'   },
  CANCELADA:              { bg: 'bg-rose-50',     text: 'text-rose-800',   dot: 'bg-rose-500'   },
};

// ── Catálogos ──────────────────────────────────
export interface AreaRP { id: number; nombre: string; activo: boolean; }
export interface CargoRP { id: number; area_id: number; cargo_superior_id?: number | null; nombre: string; activo: boolean; }
export interface CiudadRP { id: number; nombre: string; activo: boolean; }
export interface AprobadorRP {
  id: number; area_id: number;
  nombre_aprobador: string; email_aprobador: string; activo: boolean;
}
export interface CausalDescarteRP { id: number; causal: string; activo: boolean; }

// ── Requisición ────────────────────────────────
export interface EquipoItem { id: number; equipo: string; }

export interface HistorialItem {
  id: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  usuario_nombre: string;
  usuario_email: string;
  observacion: string | null;
  fecha_evento: string | null;
}

export interface ComentarioItem {
  id: number;
  usuario_nombre: string;
  usuario_email: string;
  comentario: string;
  fecha_comentario: string | null;
}

export interface RequisicionRP {
  id: number;
  rp: string | null;
  estado: EstadoRP;
  correo_solicitante: string;
  nombre_solicitante: string;
  fecha_radicacion: string | null;
  departamento: string | null;
  municipio: string | null;
  ot: string | null;
  nombre_obra_proyecto: string | null;
  direccion_obra_proyecto: string | null;
  encargado_sitio: string | null;
  numero_personas_requeridas: number;
  tsa: string | null;
  duracion_obra_contrato: string | null;
  fecha_probable_ingreso: string | null;
  centro_costo: string | null;
  perfil_requerido: string | null;
  area_id: number | null;
  area_nombre: string | null;
  cargo_id: number | null;
  cargo_nombre: string | null;
  causal_requisicion: string | null;
  otra_causal: string | null;
  aprobador_id: number | null;
  necesita_equipos_oficina: string;
  necesita_equipos_tecnologicos: string;
  requiere_simcard: string;
  tipo_plan_simcard: string | null;
  requiere_programas_especiales: string;
  programas_especiales: string | null;
  salario_asignado: number | null;
  horas_extras: string;
  modalidad_contratacion: string | null;
  tipo_contratacion: string | null;
  auxilio_movilizacion: number;
  auxilio_alimentacion: number;
  auxilio_vivienda: number;
  aprobador_nombre: string | null;
  aprobador_email: string | null;
  fecha_decision_aprobador: string | null;
  observacion_aprobador: string | null;
  gerente_nombre: string | null;
  gerente_email: string | null;
  fecha_decision_gerente: string | null;
  observacion_gerente: string | null;
  responsable_gh_nombre: string | null;
  responsable_gh_email: string | null;
  fecha_cierre: string | null;
  observacion_cierre: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Solo en detalle
  equipos_oficina?: EquipoItem[];
  equipos_tecnologicos?: EquipoItem[];
  historial?: HistorialItem[];
  comentarios?: ComentarioItem[];
}

// ── Wizard — estado local del formulario ───────
export interface FormularioRP {
  departamento: string;
  municipio: string;
  ot: string;
  nombre_obra_proyecto: string;
  direccion_obra_proyecto: string;
  encargado_sitio: string;
  numero_personas_requeridas: number;
  tsa: string;
  duracion_obra_contrato: string;
  fecha_probable_ingreso: string;
  centro_costo: string;
  perfil_requerido: string;
  // Sección 2
  area_id: number | null;
  cargo_id: number | null;
  // Sección 3
  causal_requisicion: string;
  otra_causal: string;
  aprobador_id: number | null;
  // Sección 4
  necesita_equipos_oficina: 'SI' | 'NO';
  equipos_oficina: string[];
  necesita_equipos_tecnologicos: 'SI' | 'NO';
  equipos_tecnologicos: string[];
  requiere_simcard: 'SI' | 'NO';
  tipo_plan_simcard: string;
  requiere_programas_especiales: 'SI' | 'NO';
  programas_especiales: string;
  // Sección 5
  salario_asignado: string;
  horas_extras: 'SI' | 'NO';
  modalidad_contratacion: string;
  tipo_contratacion: string;
  auxilio_movilizacion: string;
  auxilio_alimentacion: string;
  auxilio_vivienda: string;
  // Sección 6
  confirmacion: boolean;
}

export const FORMULARIO_INICIAL: FormularioRP = {
  departamento: '', municipio: '', ot: '', nombre_obra_proyecto: '', direccion_obra_proyecto: '',
  encargado_sitio: '', numero_personas_requeridas: 1, tsa: '', duracion_obra_contrato: '',
  fecha_probable_ingreso: '', centro_costo: '', perfil_requerido: '',
  area_id: null, cargo_id: null,
  causal_requisicion: '', otra_causal: '', aprobador_id: null,
  necesita_equipos_oficina: 'NO', equipos_oficina: [],
  necesita_equipos_tecnologicos: 'NO', equipos_tecnologicos: [],
  requiere_simcard: 'NO', tipo_plan_simcard: '',
  requiere_programas_especiales: 'NO', programas_especiales: '',
  salario_asignado: '', horas_extras: 'NO', modalidad_contratacion: '',
  tipo_contratacion: '', auxilio_movilizacion: '0',
  auxilio_alimentacion: '0', auxilio_vivienda: '0',
  confirmacion: false,
};

// Dashboard
export interface DashboardRP {
  total: number;
  por_estado: Record<string, number>;
  labels: Record<string, string>;
}

export interface EmpresaTemporal {
  id: number;
  nombre: string;
  activo: boolean;
  creado_en?: string;
}

export interface RequisicionTemporal {
  requisicion_id: number;
  temporal_id: number;
  nombre_temporal: string;
  fecha_envio?: string;
  fecha_envio_hv?: string;
}

export interface CandidatoRequisicion {
  id: number;
  requisicion_id: number;
  temporal_id: number;
  nombre_temporal?: string;
  nombre_candidato: string;
  estado: string; // 'POR_EVALUAR' | 'APLICA' | 'NO_APLICA' | 'CONTRATADO'
  causal_descarte?: string;
  observaciones?: string;
  creado_en?: string;
}

export interface SeguimientoStats {
  total_hv: number;
  aplica: number;
  no_aplica: number;
  contratados: number;
  por_evaluar: number;
  causales_descarte: Record<string, number>;
}
