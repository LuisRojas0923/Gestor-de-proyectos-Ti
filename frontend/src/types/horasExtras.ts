/**
 * Tipos del módulo de Horas Extras y Pre-liquidación.
 *
 * Reflejan los schemas Pydantic de:
 *   backend_v2/app/models/novedades_nomina/schemas_horas_extras.py
 *
 * Solo se exponen al frontend los tipos estrictamente necesarios para
 * construir y consumir la API REST del módulo. Los detalles de cálculo
 * (factores, topes legales) viven en el backend; el frontend solo
 * muestra los resultados.
 */

export type NivelRiesgoARL = 'I' | 'II' | 'III' | 'IV' | 'V';

export type EstadoCalculo = 'BORRADOR' | 'PENDIENTE_AUTORIZACION' | 'CONFIRMADO' | 'PAGADO' | 'COMPENSADO' | 'ANULADO';
export type EstadoOverride = 'ACTIVO' | 'REVOCADO' | 'EXPIRADO';

import type { CalculoDiarioDetalle, DetalleDiarioEstado } from './horasExtrasTrazabilidad';

export type { CalculoDiarioDetalle, DetalleDiarioEstado } from './horasExtrasTrazabilidad';

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export interface NovedadCatalogo {
  id: number;
  codigo: string;
  descripcion_corta: string;
  descripcion_larga: string | null;
  categoria: string;
  subcategoria: string;
  factor_hora_ordinaria: number;
  acredita_bolsa: boolean;
  descuenta_bolsa: boolean;
  requiere_autorizacion: boolean;
  unidad: 'HORAS' | 'DIAS';
  estado: 'ACTIVO' | 'INACTIVO';
  vigente_desde: string;
  vigente_hasta: string | null;
  observaciones: string | null;
}

// ---------------------------------------------------------------------------
// Parámetros editables de cálculo
// ---------------------------------------------------------------------------

export interface ParametroCalculo {
  codigo: string;
  nombre: string;
  valor: string;
  tipo_dato: 'NUMERICO' | 'TEXTO' | 'JSON' | 'BOOLEANO' | 'FECHA' | 'HORA';
  norma_soporte: string | null;
  grupo: string;
  editable: boolean;
  vigente_desde: string;
  vigente_hasta: string | null;
  observaciones: string | null;
}

export interface ParametrosCalculoResponse {
  parametros: ParametroCalculo[];
}

export interface ParametroCalculoUpdate {
  codigo: string;
  valor: string;
  observaciones?: string | null;
}

export interface ParametrosCalculoUpdateRequest {
  parametros: ParametroCalculoUpdate[];
}

// ---------------------------------------------------------------------------
// Horario y autorización HE
// ---------------------------------------------------------------------------

export interface HorarioPactado {
  id: number;
  cedula: string;
  minutos_jornada_ordinaria: number;
  horas_semana_ordinaria: number;
  es_jornada_nocturna: boolean;
  autoriza_he_default: boolean;
  autoriza_he_override: boolean | null;
  override_motivo: string | null;
  override_autorizado_por: string | null;
  override_fecha: string | null;
  sincronizado_en: string | null;
  fuente_sincronizacion: string;
}

export interface AutorizacionEfectiva {
  cedula: string;
  autoriza_he: boolean;
  fuente: 'OVERRIDE' | 'ERP' | 'SIN_DATOS';
  horas_semana_ordinaria: number;
  minutos_jornada_ordinaria: number;
  es_jornada_nocturna: boolean;
}

// ---------------------------------------------------------------------------
// S5'' — Horario pactado por día (L-D) editable
// ---------------------------------------------------------------------------

export interface HorarioPactadoDia {
  cedula: string;
  /** 1=Lun ... 7=Dom */
  dia_semana: number;
  /** HH:MM o null para días libres (sábado/domingo o franco) */
  hora_entrada: string | null;
  /** HH:MM o null para días libres */
  hora_salida: string | null;
  /** Minutos de almuerzo (0-240) */
  minutos_almuerzo: number;
  cruza_medianoche: boolean;
}

export interface HorarioPactadoSemana {
  cedula: string;
  dias: HorarioPactadoDia[];
}

export interface HorarioPactadoDiaUpdate {
  dia_semana: number;
  hora_entrada: string | null;
  hora_salida: string | null;
  minutos_almuerzo: number;
  cruza_medianoche: boolean;
}

// ---------------------------------------------------------------------------
// Pre-liquidación: input
// ---------------------------------------------------------------------------

export interface RegistroDiario {
  /** 1=Lun ... 7=Dom */
  dia_semana: number;
  /** HH:MM o null para días libres */
  hora_entrada: string | null;
  /** HH:MM o null para días libres */
  hora_salida: string | null;
  /** Minutos de almuerzo (0-240) */
  minutos_almuerzo: number;
  cruza_medianoche: boolean;
}

export interface EmpleadoERPDetalle {
  nrocedula: string;
  nombre: string;
  cargo?: string | null;
  area?: string | null;
  estado?: string | null;
  nivel_riesgo_arl?: NivelRiesgoARL | null;
  autoriza_he?: boolean;
  salario_base_mensual?: number | null;
}

export interface PreLiquidacionInput {
  cedula: string;
  anio: number;
  semana_iso: number;
  horas_por_dia: number[];
  codigos_por_dia?: string[][] | null;
  /**
   * S5'' UX: jornada REAL por día en formato reloj. Si se envía, el backend
   * sobreescribe horas_por_dia derivándolo de (salida - entrada) - almuerzo.
   * Días libres: hora_entrada = null.
   */
  registro_diario?: RegistroDiario[] | null;
  es_jornada_nocturna: boolean;
  salario_base_mensual?: number;
  nivel_riesgo_arl?: NivelRiesgoARL;
  ot_codigo?: string | null;
  ot_id?: number | null;
}

// ---------------------------------------------------------------------------
// Pre-liquidación: output
// ---------------------------------------------------------------------------
export interface DetalleCalculoItem {
  codigo_novedad: string;
  horas: number;
  factor_hora_ordinaria: number;
  valor_bruto: number;
  carga_prestacional: number;
  costo_total: number;
}

export interface PreLiquidacionResultado {
  cedula: string;
  anio: number;
  semana_iso: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  nivel_riesgo_arl: NivelRiesgoARL;
  factor_prestacional: number;
  salario_base_mensual: number;
  valor_hora_ordinaria: number;
  total_horas_extras: number;
  total_valor_bruto: number;
  total_carga_prestacional: number;
  total_costo_empresa: number;
  detalles: DetalleCalculoItem[];
  detalle_diario: CalculoDiarioDetalle[];
  ot_id?: number | null;
  ot_codigo?: string | null;
  observaciones?: string | null;
  firma_calculo: string;
  advertencias: string[];
}

// ---------------------------------------------------------------------------
// Confirmación de cálculo
// ---------------------------------------------------------------------------

export interface ConfirmarDetalleItem {
  codigo_novedad: string;
  horas: number;
  factor_hora_ordinaria: number;
  valor_bruto: number;
  carga_prestacional: number;
  costo_total: number;
  fuente: 'PORTAL' | 'PLANILLA' | 'ERP';
}

export interface PreLiquidacionConfirmar {
  cedula: string;
  anio: number;
  semana_iso: number;
  fecha_inicio: string;
  fecha_fin: string;
  nivel_riesgo_arl: NivelRiesgoARL;
  factor_prestacional: number;
  salario_base_mensual: number;
  valor_hora_ordinaria: number;
  detalles: ConfirmarDetalleItem[];
  detalle_diario: CalculoDiarioDetalle[];
  firma_calculo: string;
  ot_id?: number | null;
  ot_codigo?: string | null;
  usuario_confirma: string;
  observaciones?: string | null;
}

export interface PreLiquidacionConfirmada {
  calculo_id: number;
  bolsa_id: number | null;
  horas_acreditadas_bolsa: number;
  movimientos_bolsa: number[];
  costo_ot_id: number | null;
  estado: EstadoCalculo;
  mensaje: string;
}

// ---------------------------------------------------------------------------
// Lectura de cálculos
// ---------------------------------------------------------------------------

export interface CalculoDetalleRead {
  id: number;
  codigo_novedad: string;
  horas: number;
  factor_hora_ordinaria: number;
  valor_bruto: number;
  carga_prestacional: number;
  costo_total: number;
  ot_id: number | null;
  ot_codigo: string | null;
  fuente: string;
}

export interface CalculoSemanal {
  id: number;
  cedula: string;
  anio: number;
  semana_iso: number;
  fecha_inicio: string;
  fecha_fin: string;
  nivel_riesgo_arl: NivelRiesgoARL;
  factor_prestacional: number;
  salario_base_mensual: number;
  valor_hora_ordinaria: number;
  total_horas_extras: number;
  total_horas_recargo_nocturno: number;
  total_valor_bruto: number;
  total_carga_prestacional: number;
  total_costo_empresa: number;
  estado: EstadoCalculo;
  calculado_por: string | null;
  calculado_en: string | null;
  confirmado_por: string | null;
  confirmado_en: string | null;
  observaciones: string | null;
  detalles: CalculoDetalleRead[];
  detalle_diario_estado: DetalleDiarioEstado;
  detalle_diario: CalculoDiarioDetalle[];
}

export interface AutorizarCalculoResult {
  calculo_id: number;
  estado_anterior: EstadoCalculo;
  estado_nuevo: 'CONFIRMADO';
  evento_id: number | null;
  movimiento_bolsa_id: number | null;
  horas_afectadas: number;
  ya_autorizado: boolean;
  mensaje: string;
}

export interface CostoOt {
  id: number;
  ot_id: number;
  ot_codigo: string;
  anio: number;
  semana_iso: number;
  fecha_inicio: string;
  fecha_fin: string;
  total_empleados: number;
  total_horas: number;
  total_horas_hed: number;
  total_horas_hen: number;
  total_horas_hefd: number;
  total_horas_hefn: number;
  total_horas_hf: number;
  total_valor_bruto: number;
  total_carga_prestacional: number;
  total_costo_empresa: number;
  categoria_sub_indice: string | null;
  cc: string | null;
  scc: string | null;
  sub_indice: string | null;
  ultima_actualizacion: string | null;
}

// ---------------------------------------------------------------------------
// Bolsa de horas
// ---------------------------------------------------------------------------

export interface BolsaHoras {
  cedula: string;
  horas_acreditadas: number;
  horas_consumidas: number;
  horas_pagadas: number;
  horas_disponibles: number;
}

// ---------------------------------------------------------------------------
// S4 — Workflow de estados y compensación
// ---------------------------------------------------------------------------

export type EstadoWorkflowDestino = 'PAGADO' | 'COMPENSADO' | 'ANULADO';

export interface WorkflowTransicionRequest {
  estado_destino: EstadoWorkflowDestino;
  justificacion?: string | null;
  horas?: number | null;
  fecha?: string | null;
}

export interface WorkflowTransicionResult {
  calculo_id: number;
  estado_anterior: string;
  estado_nuevo: string;
  evento_id: number;
  movimiento_bolsa_id: number | null;
  horas_afectadas: number;
  mensaje: string;
}

export interface WorkflowEvento {
  id: number;
  calculo_id: number;
  estado_origen: string;
  estado_destino: string;
  justificacion: string | null;
  usuario_id: string | null;
  created_at: string | null;
}

export interface CompensarBolsaRequest {
  cedula: string;
  horas: number;
  fecha: string;
  calculo_id?: number | null;
  observaciones?: string | null;
}

export interface CompensarBolsaResponse {
  cedula: string;
  movimiento_id: number;
  horas_compensadas: number;
  horas_disponibles_despues: number;
  mensaje: string;
}

// ---------------------------------------------------------------------------
// S6 — Bolsa desactivable
// ---------------------------------------------------------------------------

export type BolsaFuente =
  | 'OVERRIDE_OT'
  | 'PARAMETRO_LEGAL'
  | 'DEFAULT';

export interface BolsaEstadoGlobalOut {
  bolsa_habilitada: boolean;
  fuente: BolsaFuente;
}

export interface BolsaOverrideOTIn {
  ot_id: number;
  bolsa_habilitada_override: boolean;
  motivo: string;
  autorizado_por: string;
}

export interface BolsaOverrideOTOut {
  id: number;
  ot_id: number;
  bolsa_habilitada_override: boolean;
  bolsa_habilitada_erp: boolean;
  motivo: string;
  autorizado_por: string;
  vigente_desde: string;
  vigente_hasta: string | null;
  estado: EstadoOverride;
  documento_soporte_url: string | null;
  creado_en: string | null;
}

export interface BolsaGlobalConfigIn {
  habilitada: boolean;
  justificacion: string;
  autorizado_por: string;
}

// ---------------------------------------------------------------------------
// S5' — Festivos
// ---------------------------------------------------------------------------

export type FuenteFestivo = 'CALENDARIFIC' | 'LEY_EMILIANI';
export type FuenteFestivoQuery = 'auto' | 'calendarific' | 'emiliani';

export interface Festivo {
  fecha: string;
  nombre: string;
  fuente: FuenteFestivo;
}

export interface FestivoSincronizarResult {
  anio: number;
  fuente: FuenteFestivo;
  cantidad: number;
  calendarific_error: string | null;
  mensaje: string;
}

// ---------------------------------------------------------------------------
// S5 — Eventos de novedades (AUS / LIC / VAC / INC)
// ---------------------------------------------------------------------------

export type NovedadEstado = 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';

export interface NovedadEventoCreate {
  cedula: string;
  codigo_novedad: string;
  fecha_inicio: string; // ISO date (YYYY-MM-DD)
  fecha_fin: string;
  observaciones?: string | null;
}

export interface NovedadEventoUpdate {
  cedula?: string;
  codigo_novedad?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  observaciones?: string | null;
}

export interface NovedadAnularRequest {
  justificacion: string;
}

export interface NovedadEventoRead {
  id: number;
  cedula: string;
  codigo_novedad: string;
  fecha_inicio: string;
  fecha_fin: string;
  observaciones: string | null;
  estado: NovedadEstado;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  confirmado_at: string | null;
  confirmado_by: string | null;
  anulado_at: string | null;
  anulado_justificacion: string | null;
}

export interface NovedadEventoListItem {
  id: number;
  cedula: string;
  codigo_novedad: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: NovedadEstado;
  created_at: string | null;
}

export interface NovedadEventoList {
  items: NovedadEventoListItem[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// S7 — Planificador semanal masivo
// Refleja schemas_horas_extras_planificador.py del backend
// ---------------------------------------------------------------------------

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
