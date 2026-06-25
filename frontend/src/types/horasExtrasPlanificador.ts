export interface EmpleadoERPRead {
  cedula: string;
  nombre: string | null;
  cargo: string | null;
  area: string | null;
  ciudadcontratacion: string | null;
  quien_reporta: string | null;
  nivel_riesgo_arl: string | null;
  autoriza_he: boolean | null;
}

export interface EmpleadoERPListResponse {
  items: EmpleadoERPRead[];
  total: number;
  limit: number;
  offset: number;
}

export interface OtManoObraRead {
  orden: string;
  cc: string | null;
  scc: string | null;
  sub_indice: string | null;
  categoria_sub_indice: string;
  descripcion: string | null;
  vr_contratado: number | null;
  estado: string | null;
  cliente: string | null;
}

export interface OtManoObraListResponse {
  items: OtManoObraRead[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlanSemanaIn {
  anio: number;
  semana_iso: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface PlanNovedadIn {
  codigo_novedad: string;
  fecha_inicio: string;
  fecha_fin: string;
  observaciones?: string | null;
}

export interface PlanAsignacionOtIn {
  orden: string;
  cc?: string | null;
  scc?: string | null;
  sub_indice?: string | null;
  categoria_sub_indice: string;
  descripcion?: string | null;
  vr_contratado?: number | null;
  horas?: number | null;
  porcentaje?: number | null;
}

export interface PlanDiaIn {
  dia_semana: number;
  hora_entrada: string | null;
  hora_salida: string | null;
  minutos_almuerzo: number;
  novedades: PlanNovedadIn[];
  asignaciones_ot: PlanAsignacionOtIn[];
}

export interface PlanEmpleadoInBase {
  cedula: string;
  dias: PlanDiaIn[];
}

export interface PlanBulkRequest {
  semana: PlanSemanaIn;
  empleados: PlanEmpleadoInBase[];
}

export interface PlanBulkEmpleadoError {
  cedula: string;
  motivo: string;
}

export interface PlanBulkResponse {
  registros_horario_creados: number;
  registros_horario_actualizados: number;
  novedades_creadas: number;
  errores: PlanBulkEmpleadoError[];
}

export interface PlanPreCalculoDetalleDia {
  dia: string;
  dia_semana: number;
  horas_trabajadas: number;
  horas_ordinarias: number;
  horas_extras: number;
  codigo_he: string | null;
  es_festivo: boolean;
  novedad_codigo: string | null;
}

export interface PlanPreCalculoEmpleado {
  cedula: string;
  total_horas_trabajadas: number;
  total_horas_ordinarias: number;
  total_horas_extras: number;
  total_costo_estimado: number;
  detalle_por_dia: PlanPreCalculoDetalleDia[];
}

export interface PlanPreCalculoResumen {
  total_horas_extras: number;
  total_costo_estimado: number;
  empleados_count: number;
}

export interface PlanPreCalculoResponse {
  empleados: PlanPreCalculoEmpleado[];
  resumen: PlanPreCalculoResumen;
}

export interface PlanConfirmarParametros {
  nivel_riesgo_arl: string;
  factor_prestacional: number;
  salario_base_mensual: number;
  valor_hora_ordinaria: number;
  jornada_nocturna: boolean;
  ot_id?: number | null;
  ot_codigo?: string | null;
}

export interface PlanConfirmarEmpleadoIn extends PlanEmpleadoInBase {
  parametros?: PlanConfirmarParametros;
}

export interface PlanConfirmarRequest {
  semana: PlanSemanaIn;
  usuario_confirma: string;
  empleados: PlanConfirmarEmpleadoIn[];
}

export interface PlanConfirmarCalculoItem {
  cedula: string;
  calculo_id: number | null;
  bolsa_id: number | null;
  horas_acreditadas_bolsa: number;
  costo_ot_id: number | null;
  bolsa_habilitada_en_confirmacion: boolean;
  bolsa_fuente: string;
  ok: boolean;
  mensaje: string;
}

export interface PlanConfirmarResumen {
  ok_count: number;
  error_count: number;
  total_horas_extras: number;
  total_costo: number;
}

export interface PlanConfirmarResponse {
  calculos: PlanConfirmarCalculoItem[];
  errores: PlanBulkEmpleadoError[];
  resumen: PlanConfirmarResumen;
}
